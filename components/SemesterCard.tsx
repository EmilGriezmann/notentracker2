'use client';

import Link from 'next/link';
import { pointsToGrade, calculateSemesterAverage } from '@/lib/store';
import { Semester } from '@/types';

interface Props {
    semester: Semester;
}

export default function SemesterCard({ semester }: Props) {
    const avgPoints = calculateSemesterAverage(semester);
    const avgGrade = avgPoints !== null ? pointsToGrade(avgPoints) : null;

    return (
        <Link href={`/semester/${semester.id}`}>
            <div className="relative group overflow-hidden rounded-3xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] transition-all duration-300 ease-spring hover:scale-[1.02] active:scale-[0.98] hover:bg-[var(--glass-hover)] cursor-pointer shadow-2xl">

                <div className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Halbjahr</span>
                            <h3 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{semester.name}</h3>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-[var(--glass-bg)] flex items-center justify-center group-hover:bg-[var(--glass-hover)] transition-colors duration-300 text-[var(--color-text)]">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex justify-end items-end border-t border-[var(--glass-border)] pt-4">
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
        </Link>
    );
}
