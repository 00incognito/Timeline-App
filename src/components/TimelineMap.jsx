import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, LayersControl, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: null,
    iconUrl: null,
    shadowUrl: null,
});

// Inner Component to handle Map State and Markers
const MarkersLayer = ({ events, currentYear }) => {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    // Track zoom level updates
    useMapEvents({
        zoom: () => {
            // Force re-render on every zoom frame for fluid motion
            setZoom(map.getZoom());
        }
    });

    // Filter active events
    const activeEvents = useMemo(() => {
        return events.filter(event => {
            return event.Year <= currentYear && event.endYear > currentYear;
        });
    }, [events, currentYear]);

    // Group events based on VISUAL PROXIMITY (Pixel Distance)
    const visibleClusters = useMemo(() => {
        if (!map) return [];

        const clusters = [];
        const RADIUS = 50; // Pixel radius to merge markers

        // Project all active events to current pixel positions
        const projected = activeEvents.map(event => {
            const point = map.latLngToLayerPoint([event.lat, event.lon]);
            return { ...event, point };
        });

        // Greedy Clustering
        projected.forEach(p => {
            // Find a cluster this point belongs to
            const existingCluster = clusters.find(c => {
                const dist = c.centerPoint.distanceTo(p.point);
                return dist < RADIUS;
            });

            if (existingCluster) {
                existingCluster.events.push(p);
            } else {
                clusters.push({
                    centerPoint: p.point,
                    lat: p.lat,
                    lon: p.lon,
                    events: [p]
                });
            }
        });

        return clusters;

    }, [activeEvents, zoom, map]);

    // Helper: Create custom icon
    const createCustomIcon = (name, isCluster = false, count = 0) => {
        const width = isCluster ? 40 : 160;
        const height = 40;

        if (isCluster) {
            return L.divIcon({
                className: 'custom-icon-container',
                html: `
          <div class="cluster-marker">
            <div class="cluster-count">${count}</div>
          </div>
        `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            });
        }

        return L.divIcon({
            className: 'custom-icon-container',
            html: `
        <div class="map-marker">
          <div class="marker-content">${name}</div>
          <div class="marker-dot"></div>
        </div>
      `,
            iconSize: [width, height],
            iconAnchor: [width / 2, height],
        });
    };

    // Calculate dynamic offset (Orbit)
    const getOffsetPos = (lat, lon, index, count) => {
        if (count <= 1) return [lat, lon];
        const centerPoint = map.latLngToLayerPoint([lat, lon]);
        const angle = (index / count) * 2 * Math.PI;
        const pixelRadius = 45;
        const offsetX = pixelRadius * Math.cos(angle);
        const offsetY = pixelRadius * Math.sin(angle);
        const newPoint = centerPoint.add([offsetX, offsetY]);
        const newLatLng = map.layerPointToLatLng(newPoint);
        return [newLatLng.lat, newLatLng.lng];
    };

    // Threshold for switching style
    // REMOVED FORCE_SPREAD_ZOOM to keep clusters intact if they overlap visually,
    // even at high zoom levels (e.g. detailed city view).

    return (
        <>
            {visibleClusters.map((group, groupIndex) => {
                const centerLat = group.lat;
                const centerLon = group.lon;
                const count = group.events.length;

                // CLUSTER BUBBLE MODE
                // Creates a bubble if 2 or more points are overlapping (within ~50px)
                if (count > 1) {
                    return (
                        <Marker
                            key={`cluster-${groupIndex}`}
                            position={[centerLat, centerLon]}
                            icon={createCustomIcon(null, true, count)}
                        >
                            <Popup className="glass-popup" autoClose={false} closeOnClick={false}>
                                <div style={{ padding: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                    <h3 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #ccc' }}>{count} People Here</h3>
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        {group.events.map((p, i) => (
                                            <li key={i}>
                                                <strong>{p.Person}</strong>
                                                <span style={{ opacity: 0.7, fontSize: '0.9em' }}> ({p.DisplayYear})</span>
                                                : {p.Event || 'Unknown Event'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Popup>
                        </Marker>
                    );
                }

                // SPREAD/ORBIT MODE (Zoomed In OR Single Person)
                return group.events.map((event, index) => {
                    // Start from the cluster center
                    const [finalLat, finalLon] = getOffsetPos(centerLat, centerLon, index, count);

                    return (
                        <Marker
                            key={`${event.Person}-${index}`}
                            position={[finalLat, finalLon]}
                            icon={createCustomIcon(event.Person)}
                        >
                            <Popup className="glass-popup" autoClose={false} closeOnClick={false}>
                                <div style={{ padding: '4px' }}>
                                    <strong>{event.Person}</strong>
                                    <span style={{ opacity: 0.7, fontSize: '0.9em' }}> ({event.DisplayYear})</span>
                                    <br />
                                    <span style={{ fontSize: '0.9em', opacity: 0.9 }}>{event.Event}</span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                });
            })}
        </>
    );
};

const TimelineMap = ({ events, currentYear }) => {
    return (
        <MapContainer
            center={[31.7683, 35.2137]}
            zoom={6}
            style={{ width: '100%', height: '100%', background: '#0c0d12' }}
            minZoom={3}
            maxZoom={18}
        >
            <LayersControl position="topright">

                <LayersControl.BaseLayer name="Dark Matter (Default)">
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Light Positron">
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Satellite (Esri)">
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer checked name="Voyager (Colorful)">
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    />
                </LayersControl.BaseLayer>

            </LayersControl>

            <MarkersLayer events={events} currentYear={currentYear} />

        </MapContainer>
    );
};

export default TimelineMap;
