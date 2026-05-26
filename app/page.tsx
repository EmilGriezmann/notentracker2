'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { loadSemesters, saveSemesters, calculateTotalAverage, pointsToGrade, createSemester } from '@/lib/store';
import { Semester } from '@/types';
import SemesterCard from '@/components/SemesterCard';
import StatsSection from '@/components/StatsSection';
import ThemeToggle from '@/components/ThemeToggle';
import { Plus } from 'lucide-react';

function GradeRing({ grade }: { grade: number }) {
    const [animatedGrade, setAnimatedGrade] = useState(6.0);
    const [animatedPct, setAnimatedPct] = useState(0);
    const frameRef = useRef<number>(0);

    const targetPct = Math.max(0, Math.min(100, ((6 - grade) / 5) * 100));

    const getColor = useCallback((g: number) => {
        if (g >= 4.0) return '#ff453a';
        const t = Math.max(0, Math.min(1, (4.0 - g) / 3.0));
        const hue = Math.round(t * 142);
        return `hsl(${hue}, 75%, 55%)`;
    }, []);

    useEffect(() => {
        const duration = 1200;
        const startTime = performance.now();
        const startGrade = 6.0;
        const startPct = 0;

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setAnimatedGrade(startGrade + (grade - startGrade) * eased);
            setAnimatedPct(startPct + (targetPct - startPct) * eased);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [grade, targetPct]);

    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (animatedPct / 100) * circumference;
    const ringColor = getColor(animatedGrade);

    return (
        <div className="relative w-[88px] h-[88px] flex items-center justify-center">
            <svg width="88" height="88" viewBox="0 0 88 88" className="absolute inset-0 -rotate-90">
                <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--ring-track)" strokeWidth="5" />
                <circle
                    cx="44" cy="44" r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                />
            </svg>
            <span className="relative text-xl font-bold text-[var(--color-text)] leading-none">
                {animatedGrade.toFixed(2)}
            </span>
        </div>
    );
}

export default function Home() {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newSemesterName, setNewSemesterName] = useState('');
    const [copySubjects, setCopySubjects] = useState(false);

    useEffect(() => {
        setSemesters(loadSemesters());
        setIsLoaded(true);
    }, []);

    const handleAddSemester = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSemesterName.trim()) return;

        const lastSemester = semesters[semesters.length - 1];
        const newSem = createSemester(
            newSemesterName.trim(),
            copySubjects && lastSemester ? lastSemester : undefined
        );

        const updated = [...semesters, newSem];
        setSemesters(updated);
        saveSemesters(updated);
        setNewSemesterName('');
        setCopySubjects(false);
        setIsAdding(false);
    };

    const totalAvgPoints = isLoaded ? calculateTotalAverage(semesters) : null;
    const totalAvgGrade = totalAvgPoints !== null ? pointsToGrade(totalAvgPoints) : null;

    if (!isLoaded) return <div className="flex h-screen items-center justify-center text-[var(--color-text-muted)]">Lade Daten...</div>;

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto selection:bg-primary/30">

            {/* Header */}
            <header className="mb-12 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <h1 className="text-5xl font-bold tracking-tight text-[var(--color-text)]">Noten</h1>
                        {totalAvgGrade !== null && totalAvgPoints !== null && (
                            <GradeRing grade={totalAvgGrade} />
                        )}
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            {/* Stats */}
            {isLoaded && semesters.length > 0 && (
                <StatsSection semesters={semesters} />
            )}

            {/* Content */}
            <section className="animate-slide-up">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-[var(--color-text)] tracking-tight">Meine Semester</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--glass-hover)] transition-all duration-200 active:scale-90"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Input Form - Glass Modal */}
                {isAdding && (
                    <div className="mb-8 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[24px] animate-scale-in">
                        <form onSubmit={handleAddSemester} className="p-6 flex flex-col gap-4">
                            <input
                                type="text"
                                value={newSemesterName}
                                onChange={(e) => setNewSemesterName(e.target.value)}
                                placeholder="Semester Name (z.B. Q2)"
                                className="flex-1 bg-transparent text-xl font-bold text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none border-b-2 border-transparent focus:border-primary/50 px-2 py-1 transition-colors w-full"
                                autoFocus
                            />
                            {semesters.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setCopySubjects(v => !v)}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all self-start ${
                                        copySubjects
                                            ? 'bg-primary/15 text-primary border border-primary/30'
                                            : 'bg-[var(--input-bg)] text-[var(--color-text-muted)] border border-[var(--glass-border)]'
                                    }`}
                                >
                                    <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${copySubjects ? 'bg-primary border-primary' : 'border-[var(--color-text-muted)]'}`}>
                                        {copySubjects && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                    </span>
                                    Fächer aus {semesters[semesters.length - 1].name} übernehmen
                                </button>
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary text-white hover:bg-primary/90 px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Erstellen
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setCopySubjects(false); }}
                                    className="flex-1 bg-[var(--glass-bg)] hover:bg-[var(--glass-hover)] text-[var(--color-text)] px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...semesters].reverse().map(sem => (
                        <SemesterCard key={sem.id} semester={sem} />
                    ))}

                    {/* Empty State */}
                    {semesters.length === 0 && !isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-[var(--glass-border)] rounded-3xl text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--glass-hover)] hover:bg-[var(--glass-bg)] transition-all group"
                        >
                            <div className="w-16 h-16 rounded-full bg-[var(--glass-bg)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus size={32} className="text-primary" />
                            </div>
                            <p className="font-semibold text-lg">Starte dein erstes Semester</p>
                            <p className="text-sm opacity-50">Tippe hier zum Erstellen</p>
                        </button>
                    )}
                </div>
            </section>
        </main>
    );
}
