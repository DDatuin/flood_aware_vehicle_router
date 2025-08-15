import requests
import os
import pandas as pd
import geopandas as gpd
from geopy.distance import geodesic
from math import inf
from shapely.geometry import Point
from itertools import product

os.environ['OGR_GEOJSON_MAX_OBJ_SIZE'] = '0'

ORS_API_KEY = os.getenv("ORS_API_KEY")
file_path = os.path.dirname(__file__)

FLOOD_WEIGHTS = {
    5: {1: 10.0, 2: 12.0, 3: 13.0},
    25: {1: 9.7, 2: 11.5, 3: 12.5},
    100: {1: 9.5, 2: 11.0, 3: 12.0}
}

FLOOD_LAYERS = {}
FLOOD_INDEXES = {}

for rp, path in [
    (5, os.path.join(file_path,'../static/data/flooding_data/y5_floods.geojson')),
    (25, os.path.join(file_path,'../static/data/flooding_data/y25_floods.geojson')),
    (100, os.path.join(file_path,'../static/data/flooding_data/y100_floods.geojson'))
]:
    gdf = gpd.read_file(path)
    FLOOD_LAYERS[rp] = gdf
    FLOOD_INDEXES[rp] = gdf.sindex

def get_flood_weight(lat, lon):
    point = Point(lon, lat)
    total_weight = 0
    for rp, gdf in FLOOD_LAYERS.items():
        idx = list(FLOOD_INDEXES[rp].intersection(point.bounds))
        if not idx:
            continue
        possible_matches = gdf.iloc[idx]
        matches = possible_matches[possible_matches.contains(point)]
        if not matches.empty:
            severity = int(matches.iloc[0]['Var'])
            total_weight += FLOOD_WEIGHTS[rp][severity]
    return total_weight
    
def order_destinations_nearest_neighbor(source, destinations):
    ordered = []
    current = source
    remaining = destinations.copy()

    while remaining:
        nearest = min(remaining, key=lambda d: geodesic(
            (current['lat'], current['lon']),
            (d['lat'], d['lon'])
        ).meters)
        ordered.append(nearest)
        remaining.remove(nearest)
        current = nearest

    return ordered

def get_directions(source, destination):
    coordinates = [
        [source['lon'], source['lat']],
        [destination['lon'], destination['lat']]
    ]

    url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json"
    }
    body = {"coordinates": coordinates, "alternative_routes": {"target_count": 3}}

    resp = requests.post(url, json=body, headers=headers)
    resp.raise_for_status()
    return resp.json()

def get_multi_point_alternatives(source, destinations):
    segments_alternatives = []
    points = [source] + destinations

    for i in range(len(points) - 1):
        seg_alts = get_segment_alternatives(points[i], points[i + 1])
        segments_alternatives.append(seg_alts)

    all_routes = []
    for combination in product(*segments_alternatives):
        route_coords = []
        route_props = {"distance": 0, "duration": 0}
        for seg in combination:
            coords = seg['geometry']['coordinates']
            if route_coords and route_coords[-1] == coords[0]:
                coords = coords[1:]
            route_coords.extend(coords)
            props = seg['properties']['summary']
            route_props['distance'] += props.get('distance', 0)
            route_props['duration'] += props.get('duration', 0)
        route = {
            "geometry": {"coordinates": route_coords},
            "properties": route_props
        }
        all_routes.append(route)

    return all_routes

def get_segment_alternatives(source, destination):
    coordinates = [[source['lon'], source['lat']], [destination['lon'], destination['lat']]]

    print("Segment coordinates:", coordinates)

    url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    headers = {"Authorization": ORS_API_KEY, "Content-Type": "application/json"}
    body = {"coordinates": coordinates, "alternative_routes": {"target_count": 3}}

    try:
        resp = requests.post(url, json=body, headers=headers)
        resp.raise_for_status()
    except requests.exceptions.HTTPError:
        print("Status code:", resp.status_code)
        print("Response:", resp.text)
        raise
    return resp.json()['features']

def compute_cost(route):
    props = route.get('properties', {})
    travel_time = props.get('duration', 0)
    travel_distance = props.get('distance', 0)

    cost = travel_time * 1.0 + travel_distance * 0.001

    coords = route['geometry']['coordinates']
    for i in range(len(coords) - 1):
        lon1, lat1 = coords[i]
        lon2, lat2 = coords[i + 1]
        
        mid_lat = (lat1 + lat2) / 2
        mid_lon = (lon1 + lon2) / 2
        
        flood_weight = get_flood_weight(mid_lat, mid_lon)
        if flood_weight > 0:
            segment_distance = geodesic((lat1, lon1), (lat2, lon2)).meters
            cost += segment_distance * flood_weight

    return cost

def optimize_route(source, destinations):
    if not destinations:
        return None
    if len(destinations) == 1:
        routes = get_directions(source, destinations[0])['features']
    else:
        sorted_destinations = order_destinations_nearest_neighbor(source, destinations)
        routes = get_multi_point_alternatives(source, sorted_destinations)

    best_route = None
    best_cost = float('inf')

    for route in routes:
        cost = compute_cost(route)
        if cost < best_cost:
            best_cost = cost
            best_route = route

    return best_route
