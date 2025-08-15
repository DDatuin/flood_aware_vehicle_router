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
    zoom: 11,
    attributionControl: false
});

window.rowMarkers = new Map();

map.on('load', () => {
  map.fitBounds(bounds, { padding: 40 });
  
  const layers = map.getStyle().layers;
  let firstSymbolLayerId;
  for (const layer of layers) {
      if (layer.type === 'symbol') {
          firstSymbolLayerId = layer.id;
          break;
      }
  }

  map.addSource('y5_flood_map', {
    type: 'geojson',
    data: '/static/data/flooding_data/y5_floods.geojson'
  });

  map.addSource('y25_flood_map', {
    type: 'geojson',
    data: '/static/data/flooding_data/y25_floods.geojson'
  });

    map.addSource('y100_flood_map', {
    type: 'geojson',
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

map.on('click', async (e) => {
    const selectedInput = window.getSelectedInput();
    if (!selectedInput) return;

    const coords = [e.lngLat.lng, e.lngLat.lat];

    const row = selectedInput.closest('.destination-row') || selectedInput.closest('.input-row');
    if (!row) return;

    const latLabel = row.querySelector('.latlong-labels h5:first-child');
    const longLabel = row.querySelector('.latlong-labels h5:last-child');
    if (latLabel && longLabel) {
        latLabel.textContent = `Lat: ${coords[1].toFixed(6)}`;
        longLabel.textContent = `Lon: ${coords[0].toFixed(6)}`;
    }

    const isSource = selectedInput.classList.contains('source-input');
    const markerColor = isSource ? 'green' : 'red';

    if (!window.rowMarkers.has(selectedInput)) {
        const marker = new maplibregl.Marker({ color: markerColor })
            .setLngLat(coords)
            .addTo(map);
        window.rowMarkers.set(selectedInput, marker);
    } else {
        const marker = window.rowMarkers.get(selectedInput);
        marker.setLngLat(coords);
        marker.getElement().style.backgroundColor = markerColor;
    }

    try {
        const response = await fetch(`/api/reverse-search/${coords[0]}/${coords[1]}`);
        const data = await response.json();
        if (data.display_name) {
            selectedInput.value = data.display_name.trim();

            if (window.updateMapMarker) {
                window.updateMapMarker(selectedInput, coords);
            }
        }
    } catch (err) {
        console.error("Reverse geocoding error:", err);
    }

    map.flyTo({ center: coords, zoom: 14 });
});

window.updateMapMarker = (input, [lng, lat]) => {
    const isSource = input.classList.contains('source-input');
    const markerColor = isSource ? 'green' : 'red';

    if (!window.rowMarkers.has(input)) {
        const marker = new maplibregl.Marker({ color: markerColor })
            .setLngLat([lng, lat])
            .addTo(map);
        window.rowMarkers.set(input, marker);
    } else {
        const marker = window.rowMarkers.get(input);
        marker.setLngLat([lng, lat]);
        marker.getElement().style.color = markerColor;
    }

    map.flyTo({ center: [lng, lat], zoom: 14 });
};