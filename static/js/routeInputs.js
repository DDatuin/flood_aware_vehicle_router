const routeInputs = document.getElementById('route-inputs');
const routeHeader = document.getElementById('route-header');

routeHeader.addEventListener('click', () => {
    routeInputs.classList.toggle('collapsed');
});

document.addEventListener('DOMContentLoaded', () => {
    const destinationsContainer = document.getElementById('destinations-container');
    const addDestinationBtn = document.getElementById('add-destination');

    const modal = document.getElementById('search-modal');
    const closeModal = document.getElementById('close-modal');
    const modalInput = document.getElementById('modal-search-input');
    const searchResults = document.getElementById('search-results');
    const submitButton = document.getElementById('submit-route');

    let debounceTimer;
    let currentInput = null;
    let selectedInput = null;

    document.addEventListener('click', e => {
        if (e.target.closest('.search-nominatim')) {
            const row = e.target.closest('.input-fields');
            currentInput = row.querySelector('input');
            modal.style.display = 'block';
            modalInput.value = currentInput.value || '';
            modalInput.focus();
            searchResults.innerHTML = '';
        }
    });

    submitButton.addEventListener('click', async () => {
        const sourceRow = document.querySelector('.input-row');
        const sourceInput = sourceRow.querySelector('.source-input');
        const sourceMarker = window.rowMarkers.get(sourceInput);

        if (!sourceMarker) {
            alert("Please select a source point on the map.");
            return;
        }

        const source = {
            lat: sourceMarker.getLngLat().lat,
            lon: sourceMarker.getLngLat().lng
        };

        const destinationRows = document.querySelectorAll('.destination-row');
        const destinations = [];

        for (const row of destinationRows) {
            const input = row.querySelector('input');
            const marker = window.rowMarkers.get(input);
            if (marker) {
                destinations.push({
                    lat: marker.getLngLat().lat,
                    lon: marker.getLngLat().lng
                });
            }
        }

        if (destinations.length === 0) {
            alert("Please select at least one destination point on the map.");
            return;
        }

        try {
            const res = await fetch('/api/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, destinations })
            });
            const data = await res.json();

            if (data.redirect) {
                window.location.href = data.redirect;
            } else {
                console.error("Unexpected response:", data);
                alert("Something went wrong. See console for details.");
            }
        } catch (err) {
            console.error("Error submitting route:", err);
            alert("Failed to submit route. See console for details.");
        }
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        currentInput = null;
    });

    window.addEventListener('click', e => {
        if (e.target === modal) {
            modal.style.display = 'none';
            currentInput = null;
        }
    });

    modalInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = modalInput.value.trim();
        if (!query) {
            searchResults.innerHTML = '';
            return;
        }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search/${encodeURIComponent(query)}`);
                const data = await res.json();
                searchResults.innerHTML = data.map(item => `
                    <li data-lat="${item.lat}" data-lon="${item.lon}">
                        ${item.display_name}
                    </li>
                `).join('');
            } catch (err) {
                console.error("Error fetching locations:", err);
                searchResults.innerHTML = '<li style="color:red;">Error fetching results</li>';
            }
        }, 1200);
    });

    searchResults.addEventListener('click', e => {
        if (e.target.tagName === 'LI' && currentInput) {
            const lat = e.target.dataset.lat;
            const lon = e.target.dataset.lon;
            currentInput.value = e.target.textContent.trim();

            const latLabel = currentInput.closest('.destination-row')?.querySelector('#lat-label') 
                             || document.querySelector('.input-row .source-input')?.closest('.input-fields')?.nextElementSibling?.querySelector('#lat-label');
            const lonLabel = currentInput.closest('.destination-row')?.querySelector('#long-label') 
                             || document.querySelector('.input-row .source-input')?.closest('.input-fields')?.nextElementSibling?.querySelector('#long-label');

            if (latLabel) latLabel.textContent = `Lat: ${lat}`;
            if (lonLabel) lonLabel.textContent = `Lon: ${lon}`;

            if (window.updateMapMarker) {
                window.updateMapMarker(currentInput, [parseFloat(lon), parseFloat(lat)]);
            }

            modal.style.display = 'none';
            currentInput = null;
        }
    });

    addDestinationBtn.addEventListener('click', () => {
        const newRow = document.createElement('div');
        newRow.className = 'destination-row';
        newRow.innerHTML = `
            <div class="input-fields">
                <input type="text" class="destination-input" placeholder="Click search to enter destination" readonly/>
                <button class="search-nominatim" title="Search"><i class="fas fa-magnifying-glass"></i></button>
                <button class="pick-on-map" title="Pick on map"><i class="fas fa-map-pin"></i></button>
                <button class="remove-dest" title="Remove"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="latlong-labels">
                <h5 id="lat-label">Lat: 0.000000</h5>
                <h5 id="long-label">Lon: 0.000000</h5>
            </div>
        `;
        destinationsContainer.appendChild(newRow);
    });

    destinationsContainer.addEventListener('input', e => {
        if (e.target.tagName === 'INPUT') {
            e.target.value = e.target.value.trimStart();
        }
    });

    destinationsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('remove-dest')) {
            const row = e.target.closest('.destination-row');
            const input = row.querySelector('input');

            if (window.rowMarkers && window.rowMarkers.has(input)) {
                const marker = window.rowMarkers.get(input);
                marker.remove();
                window.rowMarkers.delete(input);
            }

            row.remove();
        }
    });

    document.querySelector('.route-inputs').addEventListener('click', e => {
        if (e.target.classList.contains('pick-on-map')) {
            const row = e.target.closest('.destination-row') || e.target.closest('.input-row');
            if (!row) return;

            if (row.classList.contains('selected')) {
                row.classList.remove('selected');
                selectedInput = null;
            } else {
                document.querySelectorAll('.destination-row, .input-row').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                selectedInput = row.querySelector('input');
                if (e.target.closest('.input-row') && e.target.dataset.type === 'source') {
                    selectedInput = document.querySelector('.source-input');
                }
            }
        }
    });

    window.setSelectedInputForMap = input => { selectedInput = input; };
    window.getSelectedInput = () => selectedInput;
});
