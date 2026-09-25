import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faClock, faFont } from '@fortawesome/free-solid-svg-icons';
import TextOverlayLayer from './textOverlayLayer';
import { TextOverlay } from '../lib/types';

const MIN_MINUTES = 5;
const MAX_MINUTES = 3 * 24 * 60;

type Unit = 'minutes' | 'hours' | 'days';

const UNIT_TO_MINUTES: Record<Unit, number> = {
    minutes: 1,
    hours: 60,
    days: 60 * 24,
};

const PRESETS: { label: string; minutes: number; }[] = [
    { label: '5 min', minutes: 5 },
    { label: '1 hour', minutes: 60 },
    { label: '6 hours', minutes: 360 },
    { label: '1 day', minutes: 1440 },
    { label: '3 days', minutes: 4320 },
];

interface StoryLifetimePickerProps {
    previewUrl: string;
    mediaType: 'image' | 'video';
    uploading: boolean;
    textOverlays?: TextOverlay[];
    onEditText?: () => void;
    queuePosition?: number;
    queueTotal?: number;
    onConfirm: (lifetimeMinutes: number) => void;
    onCancel: () => void;
}

const StoryLifetimePicker = ({
    previewUrl,
    mediaType,
    uploading,
    textOverlays = [],
    onEditText,
    onConfirm,
    onCancel,
}: StoryLifetimePickerProps) => {
    const [unit, setUnit] = useState<Unit>('hours');
    const [value, setValue] = useState<number>(24);

    const totalMinutes = Math.round(value * UNIT_TO_MINUTES[unit]);
    const clampedMinutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, totalMinutes));
    const isOutOfRange = totalMinutes !== clampedMinutes;

    const applyPreset = (minutes: number) => {
        if (minutes % 1440 === 0) { setUnit('days'); setValue(minutes / 1440); }
        else if (minutes % 60 === 0) { setUnit('hours'); setValue(minutes / 60); }
        else { setUnit('minutes'); setValue(minutes); }
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        if (minutes < 1440) {
            const h = minutes / 60;
            return `${h % 1 === 0 ? h : h.toFixed(1)} hour${h !== 1 ? 's' : ''}`;
        }
        const d = minutes / 1440;
        return `${d % 1 === 0 ? d : d.toFixed(1)} day${d !== 1 ? 's' : ''}`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex items-center p-4 border-b border-zinc-800 text-white">
                <button onClick={onCancel} disabled={uploading}>
                    <FontAwesomeIcon icon={faXmark} className="text-xl" />
                </button>
                <h1 className="flex-1 text-center font-bold">
                    Story Duration
                </h1>
                {onEditText ? (
                    <button onClick={onEditText} disabled={uploading} aria-label="Edit text">
                        <FontAwesomeIcon icon={faFont} className="text-sm text-blue-400" />
                    </button>
                ) : (
                    <div className="w-5" />
                )}
            </div>

            <div className="flex-1 flex flex-col items-center overflow-y-auto p-4 gap-6">
                <div className="relative w-40 aspect-square rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center @container">
                    {mediaType === 'video' ? (
                        <video src={previewUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                    ) : (
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Story preview" />
                    )}
                    {textOverlays.length > 0 && <TextOverlayLayer overlays={textOverlays} />}
                </div>

                <div className="w-full max-w-sm flex flex-col gap-3">
                    <p className="text-white text-sm font-semibold text-center flex items-center justify-center gap-2">
                        <FontAwesomeIcon icon={faClock} className="text-zinc-400" />
                        Visible for {formatDuration(clampedMinutes)}
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="number"
                            min={1}
                            value={value}
                            onChange={(e) => setValue(Math.max(1, parseFloat(e.target.value) || 1))}
                            className="flex-1 bg-zinc-900 text-white text-center text-lg font-bold rounded-lg py-3 outline-none border border-zinc-700 focus:border-blue-500"
                        />
                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value as Unit)}
                            className="bg-zinc-900 text-white rounded-lg px-3 border border-zinc-700 outline-none"
                        >
                            <option value="minutes">Minutes</option>
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                        </select>
                    </div>

                    {isOutOfRange && (
                        <p className="text-amber-400 text-xs text-center">
                            Clamped to {formatDuration(clampedMinutes)} — allowed range is 5 minutes to 3 days.
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center">
                        {PRESETS.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => applyPreset(p.minutes)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${clampedMinutes === p.minutes
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4">
                <button
                    onClick={() => onConfirm(clampedMinutes)}
                    disabled={uploading}
                    className="w-full bg-blue-500 text-white font-bold py-3 rounded-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                    ) : (
                        'Share Story'
                    )}
                </button>
            </div>
        </div>
    );
};

export default StoryLifetimePicker;