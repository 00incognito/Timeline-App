import { useState, useEffect, useRef } from 'react';
import TimelineMap from './components/TimelineMap'; // Make sure path matches
import { loadData } from './utils/data';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';
import './index.css';

function App() {
    const [data, setData] = useState([]);
    const [currentYear, setCurrentYear] = useState(30); // Start at year 30 AD
    const [isPlaying, setIsPlaying] = useState(false);
    const [range, setRange] = useState({ min: 0, max: 100 });
    const playInterval = useRef(null);

    const [selectedFile, setSelectedFile] = useState('timeline.csv');

    // Available CSV files - User can add more here
    const AVAILABLE_FILES = [
        { name: 'timeline.csv', file: 'timeline.csv' },
        { name: 'timeline_original.csv', file: 'timeline_original.csv' },
        { name: 'timeline_events-3 2.csv', file: 'timeline_events-3 2.csv' }
    ];

    // Load Data whenever selectedFile changes
    useEffect(() => {
        const initData = async () => {
            // Reset state slightly during load?
            setIsPlaying(false);
            setData([]); // Clear data to trigger loading state

            const loaded = await loadData(selectedFile);
            setData(loaded);

            if (loaded.length > 0) {
                // Calculate min/max years from data
                const years = loaded.map(d => d.Year);
                const minYear = Math.min(...years);
                const maxYear = Math.max(...years);

                // For UI slider range, maybe a bit wider
                setRange({ min: minYear - 5, max: maxYear + 5 });
                // Reset to start year only if out of bounds or on initial load?
                // Let's reset to minYear for simplicity when switching datasets
                setCurrentYear(minYear);
            } else {
                console.warn('[App] No data loaded!');
            }
        };
        initData();
    }, [selectedFile]);

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

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

            {/* Map Component */}
            <TimelineMap events={data} currentYear={currentYear} />

            {/* Loading Overlay if no data yet */}
            {data.length === 0 && (
                <div className="loading-overlay">
                    <h2>Loading Timeline Data...</h2>
                </div>
            )}

            {/* Dataset Selector (Top Left) */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '60px', /* Avoid zoom controls */
                zIndex: 1000,
                background: 'rgba(20, 20, 30, 0.8)',
                padding: '8px',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <select
                    value={selectedFile}
                    onChange={(e) => setSelectedFile(e.target.value)}
                    style={{
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    {AVAILABLE_FILES.map(f => (
                        <option key={f.file} value={f.file} style={{ color: 'black' }}>
                            {f.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Controls Overlay */}
            <div className="timeline-range-container glass-panel">

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{range.min} CE</span>
                    <div className="year-display">{currentYear} CE</div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{range.max} CE</span>
                </div>

                <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    value={currentYear}
                    onChange={handleSliderChange}
                    step="1"
                />

                <div className="controls">
                    <button onClick={() => setCurrentYear(Math.max(range.min, currentYear - 5))} title="-5 Years">
                        <Rewind size={20} />
                    </button>

                    <button className="play-button" onClick={togglePlay}>
                        {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
                    </button>

                    <button onClick={() => setCurrentYear(Math.min(range.max, currentYear + 5))} title="+5 Years">
                        <FastForward size={20} />
                    </button>
                </div>
            </div>

        </div>
    );
}

export default App;
