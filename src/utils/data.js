import Papa from 'papaparse';

const processData = (data, locationMap) => {
    // 1. Group by Person
    const persons = {};

    data.forEach(row => {
        // 1. Identify Person
        const person = row.Person;
        if (!person) return; // Skip empty rows

        // 2. Normalize Location (trim spaces)
        const rawLocation = row.Location ? row.Location.trim() : '';

        if (!persons[person]) {
            persons[person] = [];
        }

        // 3. Geocode
        const coords = locationMap[rawLocation];
        if (coords) {
            // 4. Handle Event Text (CSV header might vary)
            const eventText = row['Activity/Event'] || row.Event || ''; // Fallback

            // Robustly parse year (e.g. "33 CE" -> 33, "ca. 62 CE" -> 62)
            const yearMatch = (row.Year || '').toString().match(/(\d+)/);
            const yearVal = yearMatch ? parseInt(yearMatch[0], 10) : 0;

            persons[person].push({
                ...row,
                Event: eventText, // Standardize to 'Event' property
                Year: yearVal, // Extracted numeric year
                DisplayYear: row.Year, // Raw string from CSV for display
                lat: coords.lat,
                lon: coords.lon
            });
        } else {
            // Log missing location to debug why data is skipped
            console.warn(`[processData] Skipping row for '${person}' - Location not found: '${rawLocation}'`);
        }
    });

    // 2. Sort and Calculate Durations
    const finalData = [];

    Object.keys(persons).forEach(person => {
        const events = persons[person].sort((a, b) => a.Year - b.Year);

        for (let i = 0; i < events.length; i++) {
            const currentEvent = events[i];
            let endYear;

            if (i < events.length - 1) {
                endYear = events[i + 1].Year;
            } else {
                // Last event: persists until "max" (e.g., 2025 or reasonably high number)
                endYear = 2100; // Increased max year
            }

            // Add to flat list with calculated endYear
            finalData.push({
                ...currentEvent,
                endYear: endYear
            });
        }
    });

    return finalData;
};

export const loadData = async (filename = 'timeline.csv') => {
    try {
        // 1. Fetch Geocoding Data
        const geoResponse = await fetch('/modern.json');
        if (!geoResponse.ok) throw new Error(`Failed to fetch modern.json: ${geoResponse.statusText}`);
        const geoData = await geoResponse.json();

        // Create a lookup map for coordinates: { "LocationName": { lat, lon } }
        const locationMap = {};
        if (Array.isArray(geoData)) {
            geoData.forEach(place => {
                locationMap[place.name] = { lat: place.lat, lon: place.lon };
            });
        }

        // 2. Fetch and Parse CSV
        const csvResponse = await fetch(`/${filename}`);
        if (!csvResponse.ok) throw new Error(`Failed to fetch ${filename}: ${csvResponse.statusText}`);
        const csvText = await csvResponse.text();

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rawData = results.data;
                    const processed = processData(rawData, locationMap);
                    resolve(processed);
                },
                error: (err) => {
                    console.error('[loadData] CSV Parse Error:', err);
                    reject(err);
                }
            });
        });
    } catch (error) {
        console.error("[loadData] Error loading data:", error);
        return [];
    }
};
