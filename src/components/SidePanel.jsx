import React, { useState } from 'react';
import { X, Users, MapPin, Activity, Tag, Search, CheckSquare, Square, ChevronDown, ChevronRight, Filter, Copy } from 'lucide-react';

const SidePanel = ({
    categories,
    activeCategories,
    toggleCategory,
    selectAllCategories,
    locations,
    activeLocations,
    toggleLocation,
    selectAllLocations,
    people,
    activePeople,
    togglePerson,
    selectAllPeople,
    eventsCount,
    allEvents
}) => {
    // State for collapsible sections
    const [openSection, setOpenSection] = useState(null); // 'people', 'locations', 'categories' or null
    const [personSearch, setPersonSearch] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopyResults = () => {
        if (!allEvents || allEvents.length === 0) return;

        const getCert = (c) => {
            switch (c) {
                case 1: return 'Fact';
                case 2: return 'Assumed';
                case 3: return 'Guess';
                default: return 'Unknown';
            }
        };

        const text = allEvents.map(e => {
            const certainty = getCert(e.Certainty);
            const refs = (e.References && e.References.length > 0) ? ` | Refs: ${e.References.join(', ')}` : '';
            return `[${e.DisplayYear}] ${e.Person}: ${e.Event} (${e.Location || 'Unknown Location'}) | Certainty: ${certainty}${refs}`;
        }).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const toggleSection = (section) => {
        setOpenSection(openSection === section ? null : section);
    };

    const getCertaintyLabel = (c) => {
        switch (c) {
            case 1: return { color: '#10b981', label: 'Fact' };
            case 2: return { color: '#06b6d4', label: 'Assumed' };
            case 3: return { color: '#f59e0b', label: 'Guess' };
            default: return { color: '#6b7280', label: 'Unknown' };
        }
    };

    const renderControlButtons = (items, activeItems, onSelectAll) => {
        const isAllSelected = items.length > 0 && activeItems.length === items.length;
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectAll(!isAllSelected);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: isAllSelected ? '#6b7280' : '#8b5cf6',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 500
                }}
            >
                {isAllSelected ? (
                    <>
                        <Square size={12} /> Uncheck All
                    </>
                ) : (
                    <>
                        <CheckSquare size={12} /> Check All
                    </>
                )}
            </button>
        );
    };

    const FilterSection = ({ id, label, Icon, items, activeItems, toggleItem, selectAll, hasSearch }) => {
        const isOpen = openSection === id;
        const count = activeItems.length;
        const total = items.length;

        let displayItems = items;
        if (hasSearch && personSearch) {
            displayItems = items.filter(i => i.toLowerCase().includes(personSearch.toLowerCase()));
        }

        return (
            <div style={{ borderBottom: '1px solid #2e3241' }}>
                <div
                    onClick={() => toggleSection(id)}
                    style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: isOpen ? '#232634' : 'transparent',
                        transition: 'background 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'white' }}>
                        <Icon size={16} color="#8b5cf6" />
                        {label}
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '4px' }}>
                            ({count}/{total})
                        </span>
                    </div>
                    {isOpen ? <ChevronDown size={16} color="#9ca3af" /> : <ChevronRight size={16} color="#9ca3af" />}
                </div>

                {isOpen && (
                    <div style={{ padding: '12px', background: '#1e212b' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Select Visible</span>
                            {renderControlButtons(items, activeItems, selectAll)}
                        </div>

                        {hasSearch && (
                            <div style={{ marginBottom: '10px', position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={personSearch}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setPersonSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '6px 10px 6px 30px',
                                        borderRadius: '4px',
                                        background: '#2e3241',
                                        border: '1px solid #374151',
                                        color: 'white',
                                        fontSize: '0.85rem'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {displayItems.map(item => (
                                <label key={item} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: activeItems.includes(item) ? 'rgba(139, 92, 246, 0.1)' : 'transparent' }}>
                                    <input
                                        type="checkbox"
                                        checked={activeItems.includes(item)}
                                        onChange={() => toggleItem(item)}
                                        style={{ marginRight: '8px', accentColor: '#8b5cf6' }}
                                    />
                                    <span style={{ color: activeItems.includes(item) ? 'white' : '#9ca3af', fontSize: '0.85rem' }}>
                                        {item}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: '#1a1c26',
            borderRight: '1px solid #2e3241',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            overflow: 'hidden',
            boxShadow: '4px 0 15px rgba(0,0,0,0.5)',
            zIndex: 2000
        }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #2e3241' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, textAlign: 'center' }}>
                    Timeline App
                </h2>
            </div>

            {/* Filter Accordions */}
            <div style={{ borderBottom: '1px solid #2e3241' }}>
                <FilterSection
                    id="people"
                    label="People"
                    Icon={Users}
                    items={people}
                    activeItems={activePeople}
                    toggleItem={togglePerson}
                    selectAll={selectAllPeople}
                    hasSearch={true}
                />
                <FilterSection
                    id="locations"
                    label="Locations"
                    Icon={MapPin}
                    items={locations}
                    activeItems={activeLocations}
                    toggleItem={toggleLocation}
                    selectAll={selectAllLocations}
                />
                <FilterSection
                    id="categories"
                    label="Categories"
                    Icon={Tag}
                    items={categories}
                    activeItems={activeCategories}
                    toggleItem={toggleCategory}
                    selectAll={selectAllCategories}
                />
            </div>

            {/* Events List Header */}
            <div style={{ padding: '1rem 1rem 0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={14} />
                    Events List ({eventsCount})
                </h3>
                <button
                    onClick={handleCopyResults}
                    title="Copy displayed events to clipboard"
                    style={{
                        background: 'transparent',
                        border: '1px solid #374151',
                        borderRadius: '4px',
                        color: copied ? '#10b981' : '#9ca3af',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Copy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>

            {/* Content Area (Events List) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {(!allEvents || allEvents.length === 0) ? (
                    <p style={{ opacity: 0.5, fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>No events found for current filters.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {allEvents.map((evt, idx) => {
                            const certainty = getCertaintyLabel(evt.Certainty);
                            return (
                                <div key={evt.id || idx} style={{ background: '#232634', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${certainty.color}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{evt.Person}</strong>
                                        <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 'bold' }}>{evt.DisplayYear}</span>
                                    </div>

                                    <div style={{ fontSize: '0.9rem', color: '#d1d5db', lineHeight: '1.4', marginBottom: '8px' }}>
                                        {evt.Event}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: certainty.color }}></span>
                                            <span style={{ color: '#9ca3af' }}>{certainty.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {evt.References && evt.References.map((ref, i) => (
                                                <a key={i} href={ref} target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'none' }}>
                                                    Ref {i + 1} ↗
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '0.8rem', borderTop: '1px solid #2e3241', fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                Timeline App v0.4
            </div>
        </div>
    );
};

export default SidePanel;
