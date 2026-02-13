import Papa from 'papaparse';

// Helper to normalize keys (case-insensitive) just in case
const getRowValue = (row, ...keys) => {
    for (const k of keys) {
        if (row[k] !== undefined) return row[k];
        // excessive check for case-insensitivity if needed, but strict schema is better for now
    }
    return '';
};

export const processData = (rawData, locationMap) => {
    const finalData = [];

    // 1. Sort by Date (Year)
    // We'll parse rows first, then sort.
    const parsedEvents = rawData.map((row, index) => {
        // Map fields based on new schema: Location, Date, Event, Person, Reference, Certainty
        // Plus optional: Latitude, Longitude
        const person = getRowValue(row, 'Person');
        if (!person) return null;

        const rawLocation = getRowValue(row, 'Location').trim();
        const dateStr = getRowValue(row, 'Date', 'Year'); // Support both for backward comapt
        const eventText = getRowValue(row, 'Event', 'Activity/Event');
        const reference = getRowValue(row, 'Reference');

        // Parse Reference URLs
        let references = [];
        if (reference) {
            // Split by semicolon, clean whitespace and leading dashes
            references = reference.split(';').map(ref => {
                let clean = ref.trim().replace(/^[-\s]+/, ''); // Remove leading dash/space
                if (!clean) return null;
                // Auto-prefix with https:// if it looks like a URL but missing protocol
                if (clean.includes('.') && !clean.startsWith('http')) {
                    clean = 'https://' + clean;
                }
                return clean;
            }).filter(Boolean);
        }

        const category = getRowValue(row, 'Category') || 'Uncategorized'; // New Category Field

        // Parse Certainty (1-4), default to 4 if missing/invalid
        let certainty = parseInt(getRowValue(row, 'Certainty'), 10);
        if (isNaN(certainty) || certainty < 1 || certainty > 4) certainty = 2; // Default to 'Assumed' if unknown

        // Parse Year
        const yearMatch = (dateStr || '').toString().match(/(-?\d+)/);
        const yearVal = yearMatch ? parseInt(yearMatch[0], 10) : 0;

        // Geocoding Logic
        let lat = parseFloat(getRowValue(row, 'Latitude'));
        let lon = parseFloat(getRowValue(row, 'Longitude'));

        let coords = null;
        if (!isNaN(lat) && !isNaN(lon)) {
            coords = { lat, lon };
        } else if (locationMap[rawLocation]) {
            coords = locationMap[rawLocation];
        } else {
            // Fallback / Warning
            console.warn(`[processData] Location not found: '${rawLocation}' for ${person}. Defaulting to Jerusalem.`);
            // Default to Jerusalem or 0,0
            coords = locationMap['Jerusalem'] || { lat: 31.7683, lon: 35.2137 };
        }

        return {
            id: `evt-${index}`,
            Person: person,
            Location: rawLocation,
            Event: eventText,
            Year: yearVal,
            DisplayYear: dateStr,
            Reference: reference,
            References: references,
            Category: category,
            Certainty: certainty,
            lat: coords.lat,
            lon: coords.lon
        };
    }).filter(e => e !== null);

    // 2. Sort by Year
    parsedEvents.sort((a, b) => a.Year - b.Year);

    // 3. Calculate End Years (Logic: Event lasts until the NEXT event for the SAME person)
    // We need to group by person to calculate durations, then flatten back.
    const personGroups = {};
    parsedEvents.forEach(evt => {
        if (!personGroups[evt.Person]) personGroups[evt.Person] = [];
        personGroups[evt.Person].push(evt);
    });

    Object.values(personGroups).forEach(group => {
        for (let i = 0; i < group.length; i++) {
            if (i < group.length - 1) {
                group[i].endYear = group[i + 1].Year;
            } else {
                group[i].endYear = group[i].Year + 5; // Default duration for last event
            }
            finalData.push(group[i]);
        }
    });

    return finalData;
};

// Modified loadData to accept a File object or filename string
export const loadData = async (source) => {
    try {
        // 1. Fetch Geocoding Data (Always needed for fallback)
        const geoResponse = await fetch(`${import.meta.env.BASE_URL}modern.json`);
        let locationMap = {};
        if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            // Create a lookup map for coordinates: { "LocationName": { lat, lon } }
            if (Array.isArray(geoData)) {
                geoData.forEach(place => {
                    locationMap[place.name] = { lat: place.lat, lon: place.lon };
                });
            }
        }

        // 2. Get CSV Text
        let csvText = '';
        if (source instanceof File) {
            csvText = await source.text();
        } else if (typeof source === 'string') {
            // It's a URL/filename
            const csvResponse = await fetch(`${import.meta.env.BASE_URL}${source}`);
            if (!csvResponse.ok) throw new Error(`Failed to fetch ${source}`);
            csvText = await csvResponse.text();
        } else {
            throw new Error('Invalid source passed to loadData');
        }

        // 3. Parse
        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors && results.errors.length > 0) {
                        console.warn("CSV Warnings:", results.errors);
                    }
                    const processed = processData(results.data, locationMap);
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
