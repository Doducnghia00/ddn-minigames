import React, { useState, useEffect, useMemo } from 'react';

/**
 * Game Settings Panel - Inline component for RIGHT column
 * - Replaces placeholder in GamePage.jsx
 * - Only visible to host
 * - Collapsible to save space
 * - Uses Tailwind CSS (no separate .css file)
 * - Dynamically renders settings based on gameId
 */
export function GameSettingsPanel({ room, isHost, gameId }) {
    const [settings, setSettings] = useState({});
    const [gameState, setGameState] = useState('waiting');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Get game-specific settings metadata
    const settingsMetadata = useMemo(() => {
        if (gameId === 'shooter') {
            return {
                scoreLimit: {
                    min: 5,
                    max: 50,
                    step: 5,
                    default: 5,
                    label: 'Score',
                    unit: 'kills',
                },
                matchDuration: {
                    min: 120,
                    max: 600,
                    step: 60,
                    default: 300,
                    label: 'Time',
                    unit: 's',
                    format: (v) =>
                        `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`,
                },
                bulletDamage: {
                    min: 10,
                    max: 50,
                    step: 5,
                    default: 25,
                    label: 'Damage',
                    unit: 'HP',
                },
                fireRate: {
                    min: 100,
                    max: 1000,
                    step: 50,
                    default: 800,
                    label: 'Fire Rate',
                    unit: 'ms',
                },
                respawnDelay: {
                    min: 1,
                    max: 10,
                    step: 1,
                    default: 3,
                    label: 'Respawn',
                    unit: 's',
                },
                moveSpeed: {
                    min: 150,
                    max: 300,
                    step: 10,
                    default: 200,
                    label: 'Speed',
                    unit: 'px/s',
                },
                bulletSpeed: {
                    min: 200,
                    max: 800,
                    step: 50,
                    default: 500,
                    label: 'Bullet',
                    unit: 'px/s',
                },
            };
        } else if (gameId === 'caro') {
            return {
                boardSize: {
                    min: 10,
                    max: 20,
                    step: 1,
                    default: 15,
                    label: 'Board',
                    unit: 'cells',
                },
                winCondition: {
                    min: 4,
                    max: 6,
                    step: 1,
                    default: 5,
                    label: 'Win',
                    unit: 'row',
                },
                timePerTurn: {
                    min: 0,
                    max: 120,
                    step: 5,
                    default: 0,
                    label: 'Turn',
                    unit: 's',
                    format: (v) => (v === 0 ? '∞' : v),
                },
            };
        }
        return {};
    }, [gameId]);

    useEffect(() => {
        if (!room) return;

        const listeners = [];

        // Listen to game state
        const gameStateListener = room.state.listen('gameState', (value) => {
            setGameState(value);
        });
        listeners.push(gameStateListener);

        // Listen to all cfg_* fields
        Object.keys(settingsMetadata).forEach((key) => {
            const listener = room.state.listen(`cfg_${key}`, (value) => {
                setSettings((prev) => ({ ...prev, [key]: value }));
            });
            listeners.push(listener);
        });

        // Listen for server responses
        const handleSettingsUpdated = (data) => {
            setIsSaving(false);
            setError(null);
            setSuccessMessage(`Updated by ${data.updatedBy || 'Host'}`);
            setTimeout(() => setSuccessMessage(null), 3000);
        };

        const handleSettingsError = (data) => {
            setIsSaving(false);
            setError(data.error || data.errors?.[0]?.error || 'Failed to update settings');
            setTimeout(() => setError(null), 5000);
        };

        room.onMessage('settings_updated', handleSettingsUpdated);
        room.onMessage('settings_error', handleSettingsError);

        return () => {
            listeners.forEach((l) => l());
        };
    }, [room, settingsMetadata]);

    // Only show if host
    if (!isHost) {
        return (
            <div className="glass-effect rounded-xl p-4 shadow-lg min-h-[120px] border border-dashed border-slate-600/70">
                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">
                    ⚙️ Game Settings
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-400">
                    {Object.entries(settingsMetadata).map(([key, meta]) => (
                        <div key={key} className="flex justify-between items-center">
                            <span className="text-slate-400">{meta.label}:</span>
                            <span className="text-slate-200 font-semibold">
                                {meta.format
                                    ? meta.format(settings[key] || meta.default)
                                    : settings[key] || meta.default}{' '}
                                <span className="text-slate-500 text-xs">{meta.unit}</span>
                            </span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
                    Only host can modify settings
                </p>
            </div>
        );
    }

    const canEdit = gameState !== 'playing';

    const handleChange = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        const defaults = {};
        Object.entries(settingsMetadata).forEach(([key, meta]) => {
            defaults[key] = meta.default;
        });
        setSettings(defaults);
    };

    const handleApply = () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        room.send('update_settings', { settings });
    };

    return (
        <div className="glass-effect rounded-xl shadow-lg border border-slate-700/60 overflow-hidden">
            {/* Header (collapsible) */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition"
            >
                <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                    ⚙️ Game Settings
                </div>
                <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {/* Collapsible content */}
            {isExpanded && (
                <div className="p-4 pt-0 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                    {Object.entries(settingsMetadata).map(([key, meta]) => (
                        <SettingSlider
                            key={key}
                            label={meta.label}
                            value={settings[key] || meta.default}
                            onChange={(v) => handleChange(key, v)}
                            min={meta.min}
                            max={meta.max}
                            step={meta.step}
                            unit={meta.unit}
                            format={meta.format}
                            disabled={!canEdit}
                        />
                    ))}

                    {/* Success message */}
                    {successMessage && (
                        <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded px-2 py-1.5 flex items-center gap-1">
                            <span>✓</span>
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-2 py-1.5">
                            {error}
                        </div>
                    )}

                    {/* Disabled message */}
                    {!canEdit && (
                        <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1.5">
                            Settings locked during match
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                        <button
                            onClick={handleReset}
                            disabled={!canEdit || isSaving}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg
                                     bg-slate-700/60 text-slate-300 border border-slate-600/50
                                     hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                                     transition"
                        >
                            Reset
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={!canEdit || isSaving}
                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg
                                     bg-green-600 text-white hover:bg-green-500
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition"
                        >
                            {isSaving ? 'Saving...' : 'Apply ✓'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component: Compact slider for settings
function SettingSlider({ label, value, onChange, min, max, step, unit, format, disabled }) {
    const displayValue = format ? format(value) : value;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="text-green-400 font-mono">
                    {displayValue} <span className="text-slate-500">{unit}</span>
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-3
                         [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-green-500
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-moz-range-thumb]:appearance-none
                         [&::-moz-range-thumb]:w-3
                         [&::-moz-range-thumb]:h-3
                         [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:bg-green-500
                         [&::-moz-range-thumb]:border-0
                         [&::-moz-range-thumb]:cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}

