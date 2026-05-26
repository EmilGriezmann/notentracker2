'use client';

import { Subject } from '@/types';
import { calculateSubjectAverage } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';

interface Props {
    subjects: Subject[];
}

function AnimatedRow({ name, target, color, delay }: { name: string; target: number; color: string; delay: number }) {
    const [pct, setPct] = useState(0);
    const [displayVal, setDisplayVal] = useState(0);
    const frameRef = useRef(0);

    useEffect(() => {
        setPct(0);
        setDisplayVal(0);

        const targetPct = (target / 15) * 100;
        const duration = 900;
        let startTime: number | null = null;

        const timeout = setTimeout(() => {
            const animate = (now: number) => {
                if (!startTime) startTime = now;
                const progress = Math.min((now - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);

                setPct(targetPct * eased);
                setDisplayVal(Math.round(target * eased));

                if (progress < 1) {
                    frameRef.current = requestAnimationFrame(animate);
                }
            };
            frameRef.current = requestAnimationFrame(animate);
        }, delay);

        return () => {
            clearTimeout(timeout);
            cancelAnimationFrame(frameRef.current);
        };
    }, [target, delay]);

    return (
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-semibold text-[var(--color-text)] truncate">{name}</span>
                <span className="text-xs font-bold text-[var(--color-text-muted)] tabular-nums ml-2 shrink-0">{displayVal}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--input-bg)] overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

function RankingFace({ items, label }: { items: { name: string; color: string; avg: number }[]; label: string }) {
    return (
        <div className="w-full h-full flex flex-col justify-center gap-4 px-6 py-6">
            <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{label}</span>
            {items.map((s, i) => (
                <div key={`${s.name}-${i}`} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[var(--color-text-muted)] w-4 text-right">{i + 1}</span>
                    <AnimatedRow name={s.name} target={s.avg} color={s.color} delay={i * 150} />
                </div>
            ))}
        </div>
    );
}

export default function SemesterRadar({ subjects }: Props) {
    const [flipped, setFlipped] = useState(false);
    const [animKey, setAnimKey] = useState(0);

    const withAvg = subjects
        .map(s => ({
            name: s.name,
            color: s.color || '#888',
            avg: calculateSubjectAverage(s),
        }))
        .filter(d => d.avg !== null) as { name: string; color: string; avg: number }[];

    const top3 = [...withAvg].sort((a, b) => b.avg - a.avg).slice(0, 3);
    const bottom3 = [...withAvg].sort((a, b) => a.avg - b.avg).slice(0, 3);

    if (withAvg.length === 0) return null;

    const handleFlip = () => {
        setFlipped(f => !f);
        setAnimKey(k => k + 1);
    };

    const cardClasses = "bg-[var(--glass-bg)] backdrop-blur-xl rounded-3xl border border-[var(--glass-border)] shadow-2xl flex items-center justify-center";

    return (
        <div
            className="w-full cursor-pointer"
            style={{ perspective: '800px', minHeight: '210px' }}
            onClick={handleFlip}
        >
            <div
                className="relative w-full transition-transform duration-500"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    height: '210px',
                }}
            >
                {/* Front: Top 3 */}
                <div
                    className={`absolute inset-0 ${cardClasses}`}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <RankingFace key={`top-${animKey}`} items={top3} label={`Top ${top3.length}`} />
                </div>

                {/* Back: Bottom 3 */}
                <div
                    className={`absolute inset-0 ${cardClasses}`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <RankingFace key={`bottom-${animKey}`} items={bottom3} label={`Flop ${bottom3.length}`} />
                </div>
            </div>
        </div>
    );
}
