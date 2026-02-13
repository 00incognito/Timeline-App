import React from 'react';
import { Play, Pause, Rewind, FastForward } from 'lucide-react'; // Imports left for safety

const TimelineControls = ({
    minYear,
    maxYear,
    currentYear,
    setCurrentYear,
    rangeMode,
    setRangeMode,
    activeRange,
    setActiveRange,
    showUndated,
    setShowUndated
}) => {

    const handleDualChange = (e, type) => {
        const val = parseInt(e.target.value);
        if (type === 'start') {
            const newStart = Math.min(val, activeRange.end);
            setActiveRange(prev => ({ ...prev, start: newStart }));
        } else {
            const newEnd = Math.max(val, activeRange.start);
            setActiveRange(prev => ({ ...prev, end: newEnd }));
        }
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '600px', // slightly wider for extra toggle
            background: 'rgba(26, 28, 38, 0.95)',
            borderRadius: '16px',
            border: '1px solid #2e3241',
            padding: '16px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 1000,
            backdropFilter: 'blur(10px)'
        }}>
            <style>{`
                /* Single Range Slider */
                input[type=range].custom-range {
                    -webkit-appearance: none;
                    width: 100%;
                    background: transparent;
                }
                input[type=range].custom-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #8b5cf6;
                    cursor: pointer;
                    margin-top: -6px;
                    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
                }
                input[type=range].custom-range::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 4px;
                    cursor: pointer;
                    background: #2e3241;
                    border-radius: 2px;
                }
                /* Dual Slider Thumbs */
                input[type=range].dual-thumb::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    pointer-events: all;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #8b5cf6;
                    cursor: pointer;
                    margin-top: -6px;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                    position: relative;
                    z-index: 10;
                }
                /* For Firefox */
                input[type=range].custom-range::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border: none;
                    border-radius: 50%;
                    background: #8b5cf6;
                    cursor: pointer;
                }
            `}</style>

            {/* Header: Mode Toggle, Undated Toggle, and Value Display */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Mode Switch */}
                    <div style={{ display: 'flex', gap: '4px', background: '#232634', padding: '4px', borderRadius: '8px' }}>
                        <button
                            onClick={() => setRangeMode(false)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: !rangeMode ? '#8b5cf6' : 'transparent',
                                color: !rangeMode ? 'white' : '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            Single
                        </button>
                        <button
                            onClick={() => {
                                setRangeMode(true);
                                if (activeRange.start === activeRange.end) {
                                    setActiveRange({ start: minYear, end: maxYear });
                                }
                            }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: rangeMode ? '#8b5cf6' : 'transparent',
                                color: rangeMode ? 'white' : '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            Range
                        </button>
                    </div>

                    {/* Undated Toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#9ca3af', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={showUndated}
                            onChange={(e) => setShowUndated(e.target.checked)}
                            style={{ accentColor: '#8b5cf6', width: '14px', height: '14px', cursor: 'pointer' }}
                        />
                        Show Undated
                    </label>
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#white', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 10px rgba(139, 92, 246, 0.3)' }}>
                    {rangeMode
                        ? <span style={{ color: '#8b5cf6' }}>{activeRange.start} — {activeRange.end} CE</span>
                        : <span style={{ color: '#8b5cf6' }}>{currentYear} CE</span>
                    }
                </div>
            </div>

            {/* Slider Area */}
            <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
                {!rangeMode ? (
                    <input
                        type="range"
                        min={minYear}
                        max={maxYear}
                        value={currentYear}
                        onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                        className="custom-range"
                    />
                ) : (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        {/* Background Start-to-End Track */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '0',
                            right: '0',
                            height: '4px',
                            background: '#232634',
                            marginTop: '-2px',
                            borderRadius: '2px'
                        }} />

                        {/* Selected Range Highlight */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: `${((activeRange.start - minYear) / (maxYear - minYear)) * 100}%`,
                            right: `${100 - ((activeRange.end - minYear) / (maxYear - minYear)) * 100}%`,
                            height: '4px',
                            background: '#8b5cf6',
                            marginTop: '-2px',
                            borderRadius: '2px',
                            zIndex: 1,
                            boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)'
                        }} />

                        {/* Invisible Inputs for Interaction */}
                        <input
                            type="range"
                            min={minYear}
                            max={maxYear}
                            value={activeRange.start}
                            onChange={(e) => handleDualChange(e, 'start')}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                pointerEvents: 'none',
                                appearance: 'none',
                                background: 'transparent',
                                zIndex: 5,
                                height: '100%',
                                top: 0,
                                margin: 0
                            }}
                            className="dual-thumb"
                        />
                        <input
                            type="range"
                            min={minYear}
                            max={maxYear}
                            value={activeRange.end}
                            onChange={(e) => handleDualChange(e, 'end')}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                pointerEvents: 'none',
                                appearance: 'none',
                                background: 'transparent',
                                zIndex: 6,
                                height: '100%',
                                top: 0,
                                margin: 0
                            }}
                            className="dual-thumb"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineControls;
