'use client';

import { useMemo, useState } from 'react';
import { Semester } from '@/types';
import { calculateQuarterAverage, calculateSubjectAverage, pointsToGrade } from '@/lib/store';

// Catmull-Rom → cubic Bézier smooth path
function smoothLinePath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x} ${p2.y}`;
    }
    return d;
}

// ─── Trend Card ───────────────────────────────────────────────────────────────

interface TrendPoint { name: string; avg: number }

function TrendCard({ data }: { data: TrendPoint[] }) {
    const W = 260, H = 90;
    const padL = 28, padR = 8, padT = 8, padB = 20;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const latestAvg = data.length > 0 ? data[data.length - 1].avg : null;

    if (data.length < 2) {
        return (
            <div className="col-span-2 rounded-3xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 shadow-2xl">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Verlauf</span>
                <div className="flex items-center justify-center h-24 text-[var(--color-text-muted)] text-sm">
                    Mind. 2 Semester nötig
                </div>
            </div>
        );
    }

    const values = data.map(d => d.avg);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const span = Math.max(maxVal - minVal, 1.5);
    const lo = minVal - span * 0.15;
    const hi = maxVal + span * 0.15;

    const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
    const toY = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * chartH;

    const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.avg) }));
    const linePath = smoothLinePath(pts);
    const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`;

    return (
        <div className="col-span-2 rounded-3xl bg-[var(--glass-bg)] border border-[var(--glass-border)] p-5 shadow-2xl">
            <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Verlauf</span>
                {latestAvg !== null && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-[var(--color-text)] leading-none">
                            ø {latestAvg.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            ≈ {pointsToGrade(latestAvg).toFixed(2)}
                        </div>
                    </div>
                )}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
                <defs>
                    <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.20" />
                        <stop offset="100%" stopColor="#0a84ff" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[maxVal, minVal].map((v, i) => (
                    <text key={i} x={padL - 5} y={toY(v)} fontSize="7.5" fill="var(--color-text-muted)" textAnchor="end" dominantBaseline="middle">
                        {v.toFixed(1)}
                    </text>
                ))}
                <path d={areaPath} fill="url(#statGrad)" />
                <path d={linePath} fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#0a84ff" />)}
                {data.map((d, i) => (
                    <text key={i} x={toX(i)} y={H - 4} fontSize="7.5" fill="var(--color-text-muted)"
                        textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} dominantBaseline="auto">
                        {d.name}
                    </text>
                ))}
            </svg>
        </div>
    );
}

// ─── Flip rank card ───────────────────────────────────────────────────────────

const RANK_COLORS_TOP = ['#0a84ff', '#30d158', '#ff9f0a'];
const RANK_COLORS_FLOP = ['#ff453a', '#ff9f0a', '#ffd60a'];

interface RankItem {
    title: string;
    subtitle: string;
    value: number;
    unit: string;
}

function RankFace({ heading, items, colors }: { heading: string; items: RankItem[]; colors: string[] }) {
    return (
        <div className="p-4 h-full flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-3 block">
                {heading}
            </span>
            <div className="flex flex-col gap-2.5">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ background: colors[i] }}
                        >
                            {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[var(--color-text)] truncate leading-tight">
                                {item.title}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-muted)] leading-tight truncate">
                                {item.subtitle}
                            </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <span className="text-base font-bold text-[var(--color-text)] leading-none">{item.value}</span>
                            <span className="text-[9px] text-[var(--color-text-muted)] ml-0.5">{item.unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FlipRankCard({ headingFront, headingBack, itemsFront, itemsBack }: {
    headingFront: string;
    headingBack: string;
    itemsFront: RankItem[];
    itemsBack: RankItem[];
}) {
    const [flipped, setFlipped] = useState(false);

    const faceClass = "absolute inset-0 rounded-3xl bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-2xl overflow-hidden cursor-pointer hover:bg-[var(--glass-hover)] transition-colors";

    return (
        <div className="relative h-[168px]" style={{ perspective: '800px' }} onClick={() => setFlipped(f => !f)}>
            <div
                className="w-full h-full transition-transform duration-500"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
            >
                <div className={faceClass} style={{ backfaceVisibility: 'hidden' }}>
                    <RankFace heading={headingFront} items={itemsFront} colors={RANK_COLORS_TOP} />
                </div>
                <div className={faceClass} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <RankFace heading={headingBack} items={itemsBack} colors={RANK_COLORS_FLOP} />
                </div>
            </div>
        </div>
    );
}

// ─── Stats Section ────────────────────────────────────────────────────────────

interface Props { semesters: Semester[] }

export default function StatsSection({ semesters }: Props) {
    const trendData = useMemo<TrendPoint[]>(() => {
        const points: TrendPoint[] = [];
        semesters.forEach(sem => {
            const q1 = calculateQuarterAverage(sem, 0);
            const q2 = calculateQuarterAverage(sem, 1);
            if (q1 !== null) points.push({ name: sem.name, avg: q1 });
            if (q2 !== null) points.push({ name: '', avg: q2 });
        });
        return points;
    }, [semesters]);

    const allKlausuren = useMemo(() => {
        const results: { subjectName: string; semesterName: string; quarterName: string; grade: number }[] = [];
        semesters.forEach(sem => {
            sem.subjects.filter(s => s.assessmentType === 'WRITTEN').forEach(sub => {
                sub.quarters.forEach(q => {
                    if (q.written !== undefined && q.written !== null) {
                        results.push({ subjectName: sub.name, semesterName: sem.name, quarterName: q.name, grade: q.written });
                    }
                });
            });
        });
        return results;
    }, [semesters]);

    const bestKlausuren = useMemo<RankItem[]>(() =>
        [...allKlausuren]
            .sort((a, b) => b.grade - a.grade)
            .slice(0, 3)
            .map(r => ({ title: r.subjectName, subtitle: `${r.semesterName} · ${r.quarterName}`, value: r.grade, unit: 'Pkt' })),
        [allKlausuren]);

    const worstKlausuren = useMemo<RankItem[]>(() =>
        [...allKlausuren]
            .sort((a, b) => a.grade - b.grade)
            .slice(0, 3)
            .map(r => ({ title: r.subjectName, subtitle: `${r.semesterName} · ${r.quarterName}`, value: r.grade, unit: 'Pkt' })),
        [allKlausuren]);

    const allFaecher = useMemo(() => {
        const byName = new Map<string, { totalAvg: number; count: number }>();
        semesters.forEach(sem => {
            sem.subjects.forEach(sub => {
                const avg = calculateSubjectAverage(sub);
                if (avg === null) return;
                const entry = byName.get(sub.name);
                if (entry) { entry.totalAvg += avg; entry.count++; }
                else byName.set(sub.name, { totalAvg: avg, count: 1 });
            });
        });
        return Array.from(byName.entries()).map(([name, { totalAvg, count }]) => ({
            title: name,
            subtitle: '',
            value: Math.round(totalAvg / count),
            unit: 'Pkt',
        }));
    }, [semesters]);

    const bestFaecher = useMemo<RankItem[]>(() =>
        [...allFaecher].sort((a, b) => b.value - a.value).slice(0, 3),
        [allFaecher]);

    const worstFaecher = useMemo<RankItem[]>(() =>
        [...allFaecher].sort((a, b) => a.value - b.value).slice(0, 3),
        [allFaecher]);

    if (trendData.length === 0 && bestKlausuren.length === 0 && bestFaecher.length === 0) return null;

    return (
        <section className="mb-10 animate-slide-up grid grid-cols-2 sm:grid-cols-4 gap-4">
            {trendData.length > 0 && <TrendCard data={trendData} />}
            {bestKlausuren.length > 0 && (
                <FlipRankCard
                    headingFront="Beste Klausuren"
                    headingBack="Schlechteste"
                    itemsFront={bestKlausuren}
                    itemsBack={worstKlausuren}
                />
            )}
            {bestFaecher.length > 0 && (
                <FlipRankCard
                    headingFront="Beste Fächer"
                    headingBack="Schlechteste"
                    itemsFront={bestFaecher}
                    itemsBack={worstFaecher}
                />
            )}
        </section>
    );
}
