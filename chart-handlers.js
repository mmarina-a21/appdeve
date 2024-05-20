document.addEventListener('DOMContentLoaded', function () {
    let riskFactors = [];
    let lineChart, barChart, map, geoJsonLayer;

    // Function to process the data and extract unique years, countries, and risk factors
    function processData(data) {
        // Extract unique years from the data
        const years = [...new Set(data.map(item => item.Year))];
        // Extract unique countries from the data
        const countries = [...new Set(data.map(item => item.Entity))];
        // Extract risk factors from the data (assume they start from the 3rd column)
        riskFactors = Object.keys(data[0]).slice(2);

        return { years, countries, data };
    }

    // Function to update charts with selected year and country data
    function updateCharts(data, selectedYear, selectedCountry) {
        // Filter data for the selected year and country
        const filteredData = data.filter(item => item.Year == selectedYear && item.Entity == selectedCountry);

        // Prepare data for charts
        const labels = riskFactors;
        const datasets = [{
            label: selectedCountry,
            data: riskFactors.map(factor => parseFloat(filteredData[0][factor])),
            borderColor: '#ffe1ff',
            backgroundColor: '#ffe1ff', // Solid color for bar chart
            fill: false
        }];

        // Update Line Chart
        if (lineChart) {
            lineChart.data.labels = labels;
            lineChart.data.datasets = datasets;
            lineChart.update();
        }

        // Update Bar Chart
        if (barChart) {
            barChart.data.labels = labels;
            barChart.data.datasets = datasets;
            barChart.update();
        }
    }

    // Function to update map with selected year and risk factor data
    function updateMap(data, selectedYear, selectedRiskFactor) {
        // Filter data for the selected year
        const filteredData = data.filter(item => item.Year == selectedYear);
        const maxDeaths = Math.max(...filteredData.map(item => parseFloat(item[selectedRiskFactor])));
        // Create a color scale based on the number of deaths
        const colorScale = chroma.scale(['pink', 'magenta', 'red']).domain([0, maxDeaths]);

        // Remove previous GeoJSON layer if it exists
        if (geoJsonLayer) {
            map.removeLayer(geoJsonLayer);
        }

        // Add new GeoJSON layer with updated data and styles
        geoJsonLayer = L.geoJSON(countryGeoJSON, {
            style: function (feature) {
                const countryData = filteredData.find(item => item.Entity === feature.properties.name);
                const deaths = countryData ? parseFloat(countryData[selectedRiskFactor]) : 0;
                return {
                    fillColor: colorScale(deaths).hex(),
                    fillOpacity: 0.7,
                    color: '#000',
                    weight: 1
                };
            },
            onEachFeature: function (feature, layer) {
                const countryData = filteredData.find(item => item.Entity === feature.properties.name);
                const deaths = countryData ? parseFloat(countryData[selectedRiskFactor]) : 0;
                layer.bindTooltip(`<strong>${feature.properties.name}</strong><br>${deaths} deaths`);
            }
        }).addTo(map);
    }

    // Helper function to generate a random color
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Fetch country GeoJSON data for the map
    let countryGeoJSON;
    fetch('countries.geo.json')
        .then(response => response.json())
        .then(geojson => {
            countryGeoJSON = geojson;

            // Initialize Leaflet map
            map = L.map('mapContainer').setView([20, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
        })
        .catch(error => console.error('Error fetching GeoJSON:', error));

    // Fetch data from the REST API and initialize charts
    fetch('http://your-azure-vm-ip/api.php')
        .then(response => response.json())
        .then(apiData => {
            console.log('API Data:', apiData); // Debugging log
            const { years, countries, data } = processData(apiData);

            // Populate year select dropdown
            const yearSelect = document.getElementById('yearSelect');
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.text = year;
                yearSelect.appendChild(option);
            });

            // Populate country select dropdown
            const countrySelect = document.getElementById('countrySelect');
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.text = country;
                countrySelect.appendChild(option);
            });

            // Populate risk factor select dropdown
            const riskFactorSelect = document.getElementById('riskFactorSelect');
            riskFactors.forEach(riskFactor => {
                const option = document.createElement('option');
                option.value = riskFactor;
                option.text = riskFactor;
                riskFactorSelect.appendChild(option);
            });

            // Initialize charts
            const lineCtx = document.getElementById('lineChart').getContext('2d');
            const barCtx = document.getElementById('barChart').getContext('2d');

            // Create Line Chart
            lineChart = new Chart(lineCtx, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    scales: {
                        x: {
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#444' }
                        },
                        y: {
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#444' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#e0e0e0' } }
                    }
                }
            });

            // Create Bar Chart
            barChart = new Chart(barCtx, {
                type: 'bar',
                data: { labels: [], datasets: [] },
                options: {
                    scales: {
                        x: {
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#444' }
                        },
                        y: {
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#444' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#e0e0e0' } }
                    }
                }
            });

            // Initial update of charts and map with default selections
            const initialYear = years[0];
            const initialCountry = countries[0];
            const initialRiskFactor = riskFactors[0];

            updateCharts(apiData, initialYear, initialCountry);
            updateMap(apiData, initialYear, initialRiskFactor);

            // Event listener to update charts on year selection change
            yearSelect.addEventListener('change', () => {
                const selectedYear = yearSelect.value;
                const selectedCountry = countrySelect.value;
                updateCharts(apiData, selectedYear, selectedCountry);
                updateMap(apiData, selectedYear, riskFactorSelect.value);
            });

            // Event listener to update charts on country selection change
            countrySelect.addEventListener('change', () => {
                const selectedYear = yearSelect.value;
                const selectedCountry = countrySelect.value;
                updateCharts(apiData, selectedYear, selectedCountry);
            });

            // Event listener to update map on risk factor selection change
            riskFactorSelect.addEventListener('change', () => {
                const selectedYear = yearSelect.value;
                const selectedRiskFactor = riskFactorSelect.value;
                updateMap(apiData, selectedYear, selectedRiskFactor);
            });
        })
        .catch(error => console.error('Error fetching data from API:', error));
});
