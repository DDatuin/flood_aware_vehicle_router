const bounds = [
  [120.525732, 14.337843],
  [121.509406, 14.795443]
];

const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/bright',
    sprite: "https://demotiles.maplibre.org/styles/osm-bright-gl-style/sprite",
    center: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2],
    maxBounds: bounds,
    zoom: 12,
    attributionControl: false
});

map.on('load', () => {
    console.log("Map loaded, waiting for route data...");

    if (window.routeGeoJSON) {
        if (map.isStyleLoaded()) {
            renderRoute(window.routeGeoJSON);
        } else {
            map.once('styledata', () => {
                renderRoute(window.routeGeoJSON);
            });
        }
    }

    const layers = map.getStyle().layers;
    let firstSymbolLayerId;
    for (const layer of layers) {
        if (layer.type === 'symbol') {
            firstSymbolLayerId = layer.id;
            break;
        }
    }

    map.addSource('y5_flood_map', 
    { 
        type: 'geojson', 
        data: '/static/data/flooding_data/y5_floods.geojson' 
    });

    map.addSource('y25_flood_map', 
        { 
            type: 'geojson', 
            data: '/static/data/flooding_data/y25_floods.geojson' 
    }); 

    map.addSource('y100_flood_map', 
        { 
            type: 
            'geojson', 
            data: '/static/data/flooding_data/y100_floods.geojson' 
    });

    map.addLayer({
    id:'y5-flood-fill',
    type: 'fill',
    source: 'y5_flood_map',
    paint: {
        'fill-color': [
        'match',
        ['get', 'Var'],
        1, '#b6f2a1',
        2, '#4fc24f',
        3, '#1a7f2a',
        '#888888'
        ],
        'fill-opacity': 0.40
    }
    }, firstSymbolLayerId);

    map.addLayer({
    id: 'y25-flood-fill',
    type: 'fill',
    source: 'y25_flood_map',
    paint: {
        'fill-color': [
        'match',
        ['get', 'Var'],
        1, '#e0b3ff',
        2, '#9933ff',
        3, '#4d0080',
        '#888888'
        ],
        'fill-opacity': 0.40
    }
    }, firstSymbolLayerId);

    map.addLayer({
    id: 'y100-flood-fill',
    type: 'fill',
    source: 'y100_flood_map',
    paint: {
        'fill-color': [
        'match',
        ['get', 'Var'],
        1, '#ffd9b3',
        2, '#ff9900',
        3, '#b35900',
        '#888888'
        ],
        'fill-opacity': 0.40
    }
    }, firstSymbolLayerId);

    function toggleLayer(layerId, visible) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }

    document.getElementById('toggle-y5').addEventListener('change', e => {
        toggleLayer('y5-flood-fill', e.target.checked);
    });

    document.getElementById('toggle-y25').addEventListener('change', e => {
        toggleLayer('y25-flood-fill', e.target.checked);
    });

    document.getElementById('toggle-y100').addEventListener('change', e => {
        toggleLayer('y100-flood-fill', e.target.checked);
    });
});



window.renderRoute = function(routeGeoJSON) {
    console.log(routeGeoJSON);

    if (map.getSource('route')) {
        map.getSource('route').setData(routeGeoJSON);
    } else {
        map.addSource('route', { type: 'geojson', data: routeGeoJSON });
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#0074D9', 'line-width': 6 }
        });
    }

    const coords = routeGeoJSON.features[0].geometry.coordinates
        .filter(coord => coord[0] != null && coord[1] != null);

    const bounds = coords.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 50 });

    const props = routeGeoJSON.features[0].properties;
    document.getElementById('distance').textContent = `Distance: ${(props.distance / 1000).toFixed(2)} km`;
    document.getElementById('duration').textContent = `Duration: ${(props.duration / 60).toFixed(1)} min`;
};
