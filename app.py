from flask import Flask, render_template, request, jsonify, url_for, session
from routes.optimizer import optimize_route
import tasks
import requests
import os

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change_this_to_something_secret")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search/<keyword>', methods=['GET'])
def search(keyword):
    keyword = keyword.strip()
    if not keyword:
        return jsonify([])

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "format": "json",
        "q": keyword,
        "limit": 5,
        "addressdetails": 1,
        "viewbox": "120.84,14.85,121.15,14.53",
        "bounded": 1
    }

    resp = requests.get(url, params=params, headers={"User-Agent": "Route-Planner/1.0"})
    if resp.status_code == 200:
        return jsonify(resp.json())
    else:
        return jsonify([])
    
@app.route('/api/reverse-search/<lon>/<lat>')
def reverse_search(lon, lat):

    lon, lat = lon.strip(), lat.strip()
    if not lon and not lat:
        return jsonify([])
    
    url = "https://nominatim.openstreetmap.org/reverse"

    params = {
        "format": "json",
        "lat": lat,
        "lon": lon,
        "addressdetails": 1
    }

    resp = requests.get(url, params=params, headers={"User-Agent": "Route-Planner/1.0"})
    if resp.status_code == 200:
        return jsonify(resp.json())
    else:
        return jsonify([])


@app.route('/api/optimize', methods=['POST'])
def optimize():
    data = request.get_json()
    source = data.get('source')
    destinations = data.get('destinations')

    if not source or not destinations:
        return jsonify({"error": "Source and destinations are required"}), 400

    route = optimize_route(source, destinations)

    route_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": route['geometry']['coordinates']
                },
                "properties": route.get('properties', {})
            }
        ]
    }

    session['latest_route'] = route_data
    return jsonify({"redirect": url_for('results')})

@app.route('/results')
def results():
    route_data = session.get('latest_route')
    print(route_data)
    if not route_data:
        return "No route data found", 404
    return render_template("results.html", route_data=route_data)

if __name__ == '__main__':
    app.run(debug=True)