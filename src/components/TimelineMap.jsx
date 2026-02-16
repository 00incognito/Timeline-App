import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, LayersControl, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: null,
    iconUrl: null,
    shadowUrl: null,
});

import { Copy } from 'lucide-react'; // Import Copy icon (add to top imports if missing, assumed handled or will fail if not added)

// Inner Component to handle Map State and Markers
const MarkersLayer = ({ events, currentYear, onEventSelect, selectedEvent }) => {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    // Track zoom level updates and map clicks
    useMapEvents({
        zoom: () => {
            setZoom(map.getZoom());
        },
        click: (e) => {
            // Only deselect if clicking on empty map, but this might conflict with marker click bubbling
            onEventSelect(null);
        }
    });

    // Handle Map Resize (Fix for sidebar collapse issue) AND Force Remove Default Zoom
    React.useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(map.getContainer());

        // FIX: Force remove persistent top-left zoom control if present
        const controlContainer = map.getContainer().querySelector('.leaflet-top.leaflet-left');
        if (controlContainer) {
            const zoomControl = controlContainer.querySelector('.leaflet-control-zoom');
            if (zoomControl) zoomControl.remove();
        }

        return () => resizeObserver.disconnect();
    }, [map]);

    // Auto-pan logic removed as per user request (only highlight marker)
    /*
    React.useEffect(() => {
        if (selectedEvent && selectedEvent.lat && selectedEvent.lon) {
           ...
        }
    }, [selectedEvent, map]);
    */

    // Use events directly (filtered by parent)
    const activeEvents = events;

    // Group events based on VISUAL PROXIMITY (Pixel Distance)
    const visibleClusters = useMemo(() => {
        if (!map) return [];
        const clusters = [];
        const RADIUS = 50; // Pixel radius to merge markers

        const projected = activeEvents.map(event => {
            const point = map.latLngToLayerPoint([event.lat, event.lon]);
            return { ...event, point };
        });

        // Greedy Clustering
        projected.forEach(p => {
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
    const createCustomIcon = (name, isCluster = false, count = 0, certainty = 2, isSelected = false) => {
        const width = isCluster ? 40 : 160;
        const height = 40;

        const getCertaintyColor = (level) => {
            switch (level) {
                case 1: return '#10b981'; // Emerald 500
                case 2: return '#06b6d4'; // Cyan 500 (Default Accent)
                case 3: return '#f59e0b'; // Amber 500
                case 4: return '#ef4444'; // Red 500
                default: return '#06b6d4';
            }
        };

        const markerColor = isCluster ? '#ec4899' : getCertaintyColor(certainty);
        // If selected, use a brighter border/glow or distinct style
        // We handle dot animation via class
        const dotClass = isSelected ? 'selected-marker-dot' : 'marker-dot';
        const contentStyle = isSelected
            ? `background: ${markerColor}; border: 2px solid white; box-shadow: 0 0 15px ${markerColor}; transform: scale(1.1); font-weight: bold;`
            : `background: ${markerColor}dd; border: 1px solid ${markerColor};`;

        if (isCluster) {
            // Inverse colors if cluster contains selected event
            const bg = isSelected ? '#ffffff' : markerColor;
            const fg = isSelected ? markerColor : '#ffffff';
            const border = isSelected ? `2px solid ${markerColor}` : 'none';

            return L.divIcon({
                className: 'custom-icon-container',
                html: `
          <div class="cluster-marker${isSelected ? ' selected' : ''}" style="background: ${bg}; color: ${fg}; border: ${border}; box-shadow: 0 0 15px ${markerColor}aa;">
            <div class="cluster-count" style="color: ${fg}">${count}</div>
          </div>
        `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            });
        }

        return L.divIcon({
            className: 'custom-icon-container',
            html: `
        <div class="map-marker${isSelected ? ' selected' : ''}">
          <div class="marker-content" style="${contentStyle}">
            ${name}
          </div>
          <div class="${dotClass}" style="background: ${isSelected ? '' : markerColor}; ${isSelected ? '' : `box-shadow: 0 0 10px ${markerColor};`}"></div>
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

    // Helper for certainty label (matches SidePanel)
    const getCertaintyLabel = (c) => {
        switch (c) {
            case 1: return { color: '#10b981', label: 'Fact' };
            case 2: return { color: '#06b6d4', label: 'Assumed' };
            case 3: return { color: '#f59e0b', label: 'Guess' };
            default: return { color: '#10b981', label: 'Fact' }; // Default to Fact
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        // Could show toast here but simple is fine
    };

    // Helper for Popup Content — matches SidePanel card style
    const renderPopupContent = (event, showCopy = true) => {
        const certainty = getCertaintyLabel(event.Certainty);
        return (
            <div style={{
                background: '#232634',
                padding: '10px',
                borderRadius: '8px',
                borderLeft: `3px solid ${certainty.color}`,
                minWidth: '240px'
            }}>
                {/* Top row: Person + Year */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{event.Person}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 'bold' }}>{event.DisplayYear}</span>
                        {/* Copy Button */}
                        {showCopy && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(`${event.DisplayYear} - ${event.Person}: ${event.Event}`);
                                }}
                                title="Copy Event"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    color: '#9ca3af',
                                    display: 'flex'
                                }}
                            >
                                <Copy size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Location */}
                {event.Location && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '6px' }}>
                        📍 {event.Location}
                    </div>
                )}

                {/* Event Description */}
                <div style={{ fontSize: '0.9rem', color: '#d1d5db', lineHeight: '1.4', marginBottom: '8px' }}>
                    {event.Event}
                </div>

                {/* Bottom row: Certainty + Refs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: certainty.color, display: 'inline-block' }}></span>
                        <span style={{ color: '#9ca3af' }}>{certainty.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {event.References && event.References.length > 0 && event.References.map((ref, i) => (
                            <a key={i} href={ref} target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'none' }}>
                                Ref {i + 1} ↗
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {visibleClusters.map((group, groupIndex) => {
                const centerLat = group.lat;
                const centerLon = group.lon;
                const count = group.events.length;

                // Check if this cluster contains the selected event
                const isClusterSelected = selectedEvent && group.events.some(e => e.id === selectedEvent.id);

                // CLUSTER BUBBLE MODE
                if (count > 1) {
                    const handleCopyAll = (e) => {
                        e.stopPropagation(); // Prevent map click
                        const text = group.events.map(evt =>
                            `${evt.DisplayYear} - ${evt.Person}: ${evt.Event}`
                        ).join('\n\n');
                        handleCopy(text);
                    };

                    return (
                        <Marker
                            key={`cluster-${groupIndex}`}
                            position={[centerLat, centerLon]}
                            icon={createCustomIcon(null, true, count, 2, isClusterSelected)}
                            zIndexOffset={isClusterSelected ? 1000 : 0} // Bring to front
                        >
                            <Popup>
                                <div style={{ maxHeight: '350px', overflowY: 'auto', minWidth: '260px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #2e3241' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                            Events ({count})
                                        </span>
                                        <button
                                            onClick={handleCopyAll}
                                            title="Copy All Events"
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid #374151',
                                                borderRadius: '4px',
                                                color: '#9ca3af',
                                                padding: '2px 6px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Copy size={12} /> Copy All
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {group.events.map((evt, idx) => (
                                            <div key={idx}>
                                                {renderPopupContent(evt, false)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                }

                // SPREAD/ORBIT MODE (Zoomed In OR Single Person)
                return group.events.map((event, index) => {
                    const [finalLat, finalLon] = getOffsetPos(centerLat, centerLon, index, count);
                    const isSelected = selectedEvent && selectedEvent.id === event.id;

                    return (
                        <Marker
                            key={`${event.Person}-${index}`}
                            position={[finalLat, finalLon]}
                            icon={createCustomIcon(event.Person, false, 0, event.Certainty, isSelected)}
                            zIndexOffset={isSelected ? 1000 : 0} // Bring to front
                            eventHandlers={{
                                click: (e) => {
                                    onEventSelect(event); // Select on click
                                }
                            }}
                        >
                            <Popup>
                                {renderPopupContent(event, true)}
                            </Popup>
                        </Marker>
                    );
                });
            })}
        </>
    );
};

const TimelineMap = ({ events, currentYear, onEventSelect, selectedEvent }) => {
    return (
        <MapContainer
            center={[31.7683, 35.2137]}
            zoom={6}
            style={{ width: '100%', height: '100%', background: '#0c0d12' }}
            minZoom={3}
            maxZoom={18}
            zoomControl={false}
        >
            <ZoomControl position="bottomright" />
            <LayersControl position="bottomright">

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

            <MarkersLayer events={events} currentYear={currentYear} onEventSelect={onEventSelect} selectedEvent={selectedEvent} />

        </MapContainer>
    );
};

export default TimelineMap;
