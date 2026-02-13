import { useState, useEffect, useRef, useMemo } from 'react';
import TimelineMap from './components/TimelineMap';
import SidePanel from './components/SidePanel';
import TimelineControls from './components/TimelineControls';
import { loadData } from './utils/data';
import { PanelLeft } from 'lucide-react'; // Removed Play, Pause etc as they are in controls now
import './index.css';

function App() {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    // Selection & Filter State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [categories, setCategories] = useState([]);
    const [activeCategories, setActiveCategories] = useState([]);

    // Filters
    const [locations, setLocations] = useState([]);
    const [activeLocations, setActiveLocations] = useState([]);
    const [people, setPeople] = useState([]);
    const [activePeople, setActivePeople] = useState([]); // Array for multi-select

    const [currentYear, setCurrentYear] = useState(30); // Start at year 30 AD
    const [isPlaying, setIsPlaying] = useState(false);
    const [range, setRange] = useState({ min: 0, max: 100 });

    // NEW: Timeline Controls State
    const [rangeMode, setRangeMode] = useState(false);
    const [activeRange, setActiveRange] = useState({ start: 0, end: 100 });
    const [showUndated, setShowUndated] = useState(true);

    const playInterval = useRef(null);

    const [selectedFile, setSelectedFile] = useState('timeline.csv');

    // Resize Logic
    const [panelWidth, setPanelWidth] = useState(350);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            // Limit width (min 200, max 800 or window width)
            const newWidth = Math.max(200, Math.min(window.innerWidth - 50, e.clientX));
            setPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.userSelect = ''; // Re-enable selection
            document.body.style.cursor = '';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none'; // Disable selection while dragging
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Load Data whenever selectedFile changes
    useEffect(() => {
        const initData = async () => {
            setIsPlaying(false);
            setData([]);
            setSelectedEvent(null);
            setActivePeople([]); // Reset people filter

            const loaded = await loadData(selectedFile);
            setData(loaded);

            if (loaded.length > 0) {
                // Extract Categories
                const cats = [...new Set(loaded.map(d => d.Category))].sort();
                setCategories(cats);
                setActiveCategories(cats); // Default all active

                // Extract Locations
                const locs = [...new Set(loaded.map(d => d.Location))].filter(l => l).sort();
                setLocations(locs);
                setActiveLocations(locs); // Default all active

                // Extract People
                const peeps = [...new Set(loaded.map(d => d.Person))].filter(p => p).sort();
                setPeople(peeps);
                setActivePeople(peeps); // Default all active

                // Calculate min/max years
                const years = loaded.map(d => d.Year);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);

                setRange({ min: minYear - 5, max: maxYear + 5 });
                setCurrentYear(minYear);
                setActiveRange({ start: minYear, end: maxYear });
            } else {
                console.warn('[App] No data loaded!');
            }
        };
        initData();
    }, [selectedFile]);

    // Filter Data based on Active Categories, Locations, People, and Undated Toggle
    useEffect(() => {
        setFilteredData(data.filter(d => {
            // Check for empty date if toggle is off
            // Robust check: trim whitespace OR Year is 0
            const dateStr = (d.DisplayYear || '').toString().trim();
            if (!showUndated && (!dateStr || d.Year === 0)) return false;

            return activeCategories.includes(d.Category) &&
                activeLocations.includes(d.Location) &&
                activePeople.includes(d.Person);
        }));
    }, [data, activeCategories, activeLocations, activePeople, showUndated]);

    // Playback Logic
    useEffect(() => {
        if (isPlaying) {
            playInterval.current = setInterval(() => {
                setCurrentYear(prev => {
                    if (prev >= range.max) {
                        setIsPlaying(false);
                        return range.max;
                    }
                    return prev + 1;
                });
            }, 1000); // 1 year per second
        } else {
            clearInterval(playInterval.current);
        }
        return () => clearInterval(playInterval.current);
    }, [isPlaying, range.max]);

    const handleSliderChange = (e) => {
        setCurrentYear(parseInt(e.target.value, 10));
        setIsPlaying(false); // Stop auto-play on interaction
    };

    const togglePlay = () => setIsPlaying(!isPlaying);

    // Filter Toggles
    const toggleCategory = (cat) => {
        setActiveCategories(prev =>
            prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
        );
    };
    const selectAllCategories = (select) => setActiveCategories(select ? categories : []);

    const toggleLocation = (loc) => {
        setActiveLocations(prev =>
            prev.includes(loc)
                ? prev.filter(l => l !== loc)
                : [...prev, loc]
        );
    };
    const selectAllLocations = (select) => setActiveLocations(select ? locations : []);

    const togglePerson = (person) => {
        setActivePeople(prev =>
            prev.includes(person)
                ? prev.filter(p => p !== person)
                : [...prev, person]
        );
    };
    const selectAllPeople = (select) => setActivePeople(select ? people : []);


    // Helper to get currently visible events based on year or range
    const displayedEvents = useMemo(() => {
        return filteredData.filter(e => {
            // Check if this is an undated event
            const dateStr = (e.DisplayYear || '').toString().trim();
            const isUndated = !dateStr || e.Year === 0;

            // Undated events: show them if showUndated is on (they already passed filteredData check)
            // They should bypass the year/range filter entirely
            if (isUndated) return true;

            // Dated events: apply year/range filter
            if (!rangeMode) {
                return e.Year <= currentYear && e.endYear > currentYear;
            }
            // Range Overlap Logic
            const eStart = e.Year;
            const eEnd = e.endYear;
            return eStart <= activeRange.end && eEnd > activeRange.start;
        });
    }, [filteredData, currentYear, rangeMode, activeRange, showUndated]);

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#0c0d12' }}>

            {/* Side Panel Container */}
            <div style={{
                width: isPanelOpen ? `${panelWidth}px` : '0px',
                flexShrink: 0,
                transition: isResizing ? 'none' : 'width 0.3s ease-in-out',
                position: 'relative',
                display: 'flex'
            }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <SidePanel
                        categories={categories}
                        activeCategories={activeCategories}
                        toggleCategory={toggleCategory}
                        selectAllCategories={selectAllCategories}
                        locations={locations}
                        activeLocations={activeLocations}
                        toggleLocation={toggleLocation}
                        selectAllLocations={selectAllLocations}
                        people={people}
                        activePeople={activePeople}
                        togglePerson={togglePerson}
                        selectAllPeople={selectAllPeople}
                        eventsCount={displayedEvents.length}
                        allEvents={displayedEvents}
                        currentYear={currentYear}
                    />
                </div>

                {/* Resize Handle (Only visible when panel is open) */}
                {isPanelOpen && (
                    <div
                        onMouseDown={() => setIsResizing(true)}
                        style={{
                            width: '5px',
                            cursor: 'col-resize',
                            background: isResizing ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            zIndex: 2200,
                            transition: 'background 0.2s'
                        }}
                        title="Drag to resize"
                    />
                )}
            </div>

            {/* Map Container */}
            <div style={{ flex: 1, position: 'relative' }}>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '15px',
                        zIndex: 1100,
                        background: 'rgba(20, 20, 30, 0.8)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title={isPanelOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    <PanelLeft size={20} />
                </button>

                {/* Map Component */}
                <TimelineMap
                    events={displayedEvents}
                    currentYear={currentYear}
                    activePeople={activePeople}
                />

                {/* Loading Overlay if no data yet */}
                {data.length === 0 && (
                    <div className="loading-overlay">
                        <h2>Loading Timeline Data...</h2>
                    </div>
                )}

                {/* Data Controls (Top Left) */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '60px',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center'
                }}>
                    <div style={{
                        background: 'rgba(20, 20, 30, 0.8)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <label style={{
                            color: 'white',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <span>📂 Upload CSV</span>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                                style={{ display: 'none' }}
                            />
                        </label>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }}></div>

                        <a
                            href={`${import.meta.env.BASE_URL}timeline_template.csv`}
                            download="timeline_template.csv"
                            style={{
                                color: '#4a9eff',
                                textDecoration: 'none',
                                fontSize: '0.9rem',
                                fontWeight: 500
                            }}
                        >
                            ⬇ Template
                        </a>
                    </div>
                </div>

                {/* Controls Overlay */}
                <TimelineControls
                    minYear={range.min}
                    maxYear={range.max}
                    currentYear={currentYear}
                    setCurrentYear={(val) => {
                        setCurrentYear(val);
                        setIsPlaying(false);
                    }}
                    rangeMode={rangeMode}
                    setRangeMode={setRangeMode}
                    activeRange={activeRange}
                    setActiveRange={setActiveRange}
                    // isPlaying={isPlaying} // Removed from component but kept in state if needed
                    // togglePlay={() => setIsPlaying(!isPlaying)}
                    showUndated={showUndated}
                    setShowUndated={setShowUndated}
                />

            </div>
        </div>
    );
}

export default App;
