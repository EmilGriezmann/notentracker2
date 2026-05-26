'use client';

import Link from 'next/link';
import { useState } from 'react';
import { pointsToGrade, calculateSemesterAverage, calculateSubjectAverage } from '@/lib/store';
import { Semester } from '@/types';

interface Props {
    semester: Semester;
}

export default function SemesterCard({ semester }: Props) {
    const [flipped, setFlipped] = useState(false);

    const avgPoints = calculateSemesterAverage(semester);
    const avgGrade = avgPoints !== null ? pointsToGrade(avgPoints) : null;

    const withAvg = semester.subjects
        .map(s => ({ name: s.name, color: s.color || '#888', avg: calculateSubjectAverage(s) }))
        .filter(d => d.avg !== null) as { name: string; color: string; avg: number }[];

    const top3 = [...withAvg].sort((a, b) => b.avg - a.avg).slice(0, 3);
    const top3Names = new Set(top3.map(s => s.name));
    const bottom3 = [...withAvg].sort((a, b) => a.avg - b.avg).filter(s => !top3Names.has(s.name)).slice(0, 3);
    const canFlip = withAvg.length > 0;

    const faceClass = "absolute inset-0 rounded-3xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-2xl overflow-hidden";

    return (
        <div className="relative h-[200px]" style={{ perspective: '800px' }}>
            <div
                className="w-full h-full transition-transform duration-500"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                {/* Front: semester overview */}
                <div
                    className={`${faceClass} ${canFlip ? 'cursor-pointer hover:bg-[var(--glass-hover)]' : ''} transition-colors group`}
                    style={{ backfaceVisibility: 'hidden' }}
                    onClick={() => canFlip && setFlipped(true)}
                >
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Halbjahr</span>
                                <h3 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{semester.name}</h3>
                            </div>
                            <Link
                                href={`/semester/${semester.id}`}
                                onClick={e => e.stopPropagation()}
                                className="w-10 h-10 rounded-full bg-[var(--glass-bg)] flex items-center justify-center hover:bg-[var(--glass-hover)] transition-colors duration-300 text-[var(--color-text)]"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </Link>
                        </div>

                        <div className="flex justify-end items-end border-t border-[var(--glass-border)] pt-4 mt-auto">
                            {avgGrade !== null ? (
                                <span className="text-3xl font-bold text-[var(--color-text)] leading-none tracking-tight">
                                    {avgGrade.toFixed(2)}
                                </span>
                            ) : (
                                <span className="text-[var(--color-text-muted)] italic text-sm">--</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back: Top / Flop */}
                <div
                    className={`${faceClass} cursor-pointer hover:bg-[var(--glass-hover)] transition-colors`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    onClick={() => setFlipped(false)}
                >
                    <div className="p-4 h-full flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{semester.name}</span>
                            <Link
                                href={`/semester/${semester.id}`}
                                onClick={e => e.stopPropagation()}
                                className="w-7 h-7 rounded-full bg-[var(--glass-bg)] flex items-center justify-center hover:bg-[var(--glass-hover)] transition-colors text-[var(--color-text)]"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </Link>
                        </div>

                        <div className="flex-1 flex flex-col gap-2">
                            <div>
                                <span className="text-[9px] font-bold text-success uppercase tracking-widest">Top {top3.length}</span>
                                <div className="mt-1 flex flex-col">
                                    {top3.map((s, i) => (
                                        <div key={i} className="flex items-center gap-1.5 py-[3px]">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="text-[11px] font-medium text-[var(--color-text)] truncate flex-1">{s.name}</span>
                                            <span className="text-[11px] font-bold tabular-nums text-[var(--color-text)]">{Math.round(s.avg)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {bottom3.length > 0 && (
                                <div className="border-t border-[var(--glass-border)] pt-2">
                                    <span className="text-[9px] font-bold text-danger uppercase tracking-widest">Flop {bottom3.length}</span>
                                    <div className="mt-1 flex flex-col">
                                        {bottom3.map((s, i) => (
                                            <div key={i} className="flex items-center gap-1.5 py-[3px]">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                                                <span className="text-[11px] font-medium text-[var(--color-text)] truncate flex-1">{s.name}</span>
                                                <span className="text-[11px] font-bold tabular-nums text-[var(--color-text)]">{Math.round(s.avg)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
