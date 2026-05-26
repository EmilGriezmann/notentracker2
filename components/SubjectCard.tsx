'use client';

import { useState, useEffect, useRef } from 'react';
import { calculateSubjectAverage } from '@/lib/store';
import { Subject } from '@/types';
import clsx from 'clsx';
import { ChevronDown, Edit2, Trash2, X } from 'lucide-react';

interface Props {
    subject: Subject;
    onChange: (updated: Subject) => void;
    onDelete: () => void;
    onEdit: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

export default function SubjectCard({ subject, onChange, onDelete, onEdit, isExpanded, onToggleExpand }: Props) {
    const [localQuarters, setLocalQuarters] = useState(subject.quarters);
    const [overrideInput, setOverrideInput] = useState(
        subject.finalOverride !== undefined ? String(subject.finalOverride) : ''
    );
    const [isEditingOverride, setIsEditingOverride] = useState(false);

    // Swipe state
    const [swipeX, setSwipeX] = useState(0);
    const touchStartX = useRef(0);
    const touchCurrentX = useRef(0);
    const isSwiping = useRef(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalQuarters(subject.quarters);
        setOverrideInput(subject.finalOverride !== undefined ? String(subject.finalOverride) : '');
        setIsEditingOverride(false);
    }, [subject.quarters, subject.finalOverride]);

    const averagePoints = calculateSubjectAverage(subject);
    const roundedPoints = averagePoints !== null ? Math.round(averagePoints) : null;

    const handleGradeChange = (qIndex: number, type: 'somi' | 'written', value: number | undefined) => {
        const newQuarters = localQuarters.map((q, i) =>
            i === qIndex ? { ...q, [type]: value } : q
        );
        setLocalQuarters(newQuarters);
        onChange({ ...subject, quarters: newQuarters });
    };

    const commitOverride = () => {
        const trimmed = overrideInput.trim();
        const parsed = trimmed === '' ? undefined : Number.parseInt(trimmed, 10);
        if (parsed !== undefined && (Number.isNaN(parsed) || parsed < 0 || parsed > 15)) return;
        onChange({ ...subject, finalOverride: parsed === undefined ? undefined : parsed });
        setIsEditingOverride(false);
    };

    // Swipe handlers (disabled when expanded)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (isExpanded) return;
        touchStartX.current = e.touches[0].clientX;
        touchCurrentX.current = e.touches[0].clientX;
        isSwiping.current = true;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current || isExpanded) return;
        touchCurrentX.current = e.touches[0].clientX;
        const diff = touchStartX.current - touchCurrentX.current;
        setSwipeX(Math.max(0, Math.min(diff, 100)));
    };

    const handleTouchEnd = () => {
        if (!isSwiping.current || isExpanded) return;
        isSwiping.current = false;
        setSwipeX(swipeX >= 80 ? 80 : 0);
    };

    return (
        <div className="relative overflow-hidden rounded-3xl" ref={cardRef}>
            {/* Delete button behind */}
            <div
                className="absolute inset-y-0 right-0 w-20 bg-danger flex items-center justify-center text-white rounded-r-3xl transition-opacity"
                style={{ opacity: swipeX > 10 ? 1 : 0 }}
            >
                <button onClick={() => { setSwipeX(0); onDelete(); }} className="w-full h-full flex items-center justify-center">
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Main card content */}
            <div
                className={clsx(
                    "relative bg-[var(--glass-bg)] backdrop-blur-xl rounded-3xl overflow-hidden border border-[var(--glass-border)] transition-all duration-300 ease-spring hover:bg-[var(--glass-hover)] shadow-2xl group",
                    isExpanded && "border-[var(--glass-hover)]"
                )}
                style={{ transform: `translateX(-${swipeX}px)`, transition: isSwiping.current ? 'none' : 'transform 0.3s ease' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header Row */}
                <div className="px-4 py-4 sm:py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-semibold text-white/90"
                            style={{ backgroundColor: subject.color || '#333' }}
                        >
                            {subject.type}
                        </div>
                        <h3 className="font-medium text-[var(--color-text)] tracking-wide">{subject.name}</h3>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all duration-200 opacity-0 group-hover:opacity-100 active:scale-90"
                        >
                            <Edit2 size={13} />
                        </button>

                        {isEditingOverride ? (
                            <input
                                autoFocus
                                type="number"
                                min="0" max="15" step="1"
                                value={overrideInput}
                                onChange={(e) => setOverrideInput(e.target.value)}
                                onBlur={commitOverride}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitOverride(); }
                                    if (e.key === 'Escape') {
                                        setIsEditingOverride(false);
                                        setOverrideInput(subject.finalOverride !== undefined ? String(subject.finalOverride) : '');
                                    }
                                }}
                                className="w-14 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-md px-2 py-1 text-center text-base sm:text-lg font-bold text-[var(--color-text)] outline-none focus:border-primary/60"
                                placeholder="–"
                            />
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsEditingOverride(true); }}
                                className={clsx(
                                    "text-base sm:text-lg font-bold tabular-nums px-2 py-1 rounded-md transition-colors",
                                    subject.finalOverride !== undefined ? "text-primary" : "text-[var(--color-text)]"
                                )}
                                title="Zeugnisnote überschreiben (0-15 Punkte)"
                            >
                                {roundedPoints !== null ? roundedPoints : '—'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                            className={clsx(
                                "w-12 h-12 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all duration-300 ease-spring active:scale-90 touch-manipulation",
                                isExpanded && "rotate-180 text-[var(--color-text)]"
                            )}
                            aria-expanded={isExpanded}
                        >
                            <ChevronDown size={15} />
                        </button>
                    </div>
                </div>

                {/* Grades section */}
                {isExpanded && (
                    <div className="border-t border-[var(--glass-border)] animate-expand">
                        <div className="grid grid-cols-2">
                            {localQuarters.map((q, qIdx) => (
                                <div key={q.id || qIdx} className={clsx("p-3", qIdx === 0 && "border-r border-[var(--glass-border)]")}>
                                    <div className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 text-center">
                                        {q.name}
                                    </div>
                                    <div className="flex gap-2">
                                        <GradeCell
                                            label="Somi"
                                            value={q.somi}
                                            onChange={v => handleGradeChange(qIdx, 'somi', v)}
                                        />
                                        {subject.assessmentType === 'WRITTEN' && (
                                            <GradeCell
                                                label="Klausur"
                                                value={q.written}
                                                onChange={v => handleGradeChange(qIdx, 'written', v)}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function GradeCell({ label, value, onChange }: {
    label: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
}) {
    return (
        <div className="flex-1 rounded-xl bg-[var(--input-bg)] p-1.5 flex flex-col items-center relative">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase mb-1 tracking-wide pointer-events-none">
                {label}
            </span>
            <span className={clsx(
                "text-sm font-bold py-0.5 leading-none pointer-events-none",
                value !== undefined ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
            )}>
                {value !== undefined ? value : '—'}
            </span>
            <select
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                value={value !== undefined ? value : ''}
                onChange={e => {
                    const v = e.target.value;
                    onChange(v === '' ? undefined : Number(v));
                }}
            >
                <option value="">—</option>
                {Array.from({ length: 16 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                ))}
            </select>
        </div>
    );
}
