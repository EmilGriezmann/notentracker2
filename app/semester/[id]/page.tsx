'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { loadSemesters, saveSemesters, loadSubjectDefinitions, calculateSemesterAverage, calculateQuarterAverage, pointsToGrade, sortSubjects } from '@/lib/store';
import { Semester, Subject, SubjectDefinition } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, X, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import SubjectCard from '@/components/SubjectCard';
import SemesterRadar from '@/components/SemesterRadar';
import ThemeToggle from '@/components/ThemeToggle';
import clsx from 'clsx';

function SemesterGradeRing({ grade, points }: { grade: number; points: number }) {
    const [animatedGrade, setAnimatedGrade] = useState(6.0);
    const [animatedPct, setAnimatedPct] = useState(0);
    const [showPoints, setShowPoints] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);
    const prevGradeRef = useRef<number | null>(null);
    const frameRef = useRef<number>(0);

    const targetPct = Math.max(0, Math.min(100, ((6 - grade) / 5) * 100));

    const getColor = useCallback((g: number) => {
        if (g >= 4.0) return '#ff453a';
        const t = Math.max(0, Math.min(1, (4.0 - g) / 3.0));
        const hue = Math.round(t * 142);
        return `hsl(${hue}, 75%, 55%)`;
    }, []);

    useEffect(() => {
        // Trigger pulse on grade change (not initial render)
        if (prevGradeRef.current !== null && prevGradeRef.current !== grade) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 600);
            return () => clearTimeout(timer);
        }
    }, [grade]);

    useEffect(() => {
        prevGradeRef.current = grade;
    }, [grade]);

    useEffect(() => {
        const duration = 1200;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setAnimatedGrade(6.0 + (grade - 6.0) * eased);
            setAnimatedPct(targetPct * eased);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setShowPoints(true);
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [grade, targetPct]);

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const strokeDash = (animatedPct / 100) * circumference;
    const ringColor = getColor(animatedGrade);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className={clsx(
                "relative w-[160px] h-[160px] flex items-center justify-center",
                isPulsing && "animate-ring-pulse"
            )}>
                <svg width="160" height="160" viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
                    <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--ring-track)" strokeWidth="7" />
                    <circle
                        cx="80" cy="80" r={radius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${strokeDash} ${circumference}`}
                    />
                </svg>
                <span className="relative text-5xl font-bold text-[var(--color-text)] leading-none">
                    {animatedGrade.toFixed(2)}
                </span>
            </div>
            <div className={clsx(
                "text-sm font-mono text-primary font-bold bg-primary/10 px-4 py-1 rounded-full transition-opacity duration-500",
                showPoints ? "opacity-100" : "opacity-0"
            )}>
                {points.toFixed(2)}
            </div>
        </div>
    );
}

const SUBJECT_SUGGESTIONS = [
    'Deutsch', 'Mathematik', 'Englisch', 'Physik', 'Chemie',
    'Biologie', 'Geschichte', 'Geographie', 'Informatik', 'Sport',
    'Musik', 'Kunst', 'Philosophie', 'Sozialkunde', 'Französisch',
    'Spanisch', 'Latein', 'Russisch', 'Pädagogik', 'Wirtschaft',
    'Psychologie', 'Religion', 'Ethik', 'Italienisch', 'Chinesisch',
];

// Apple-inspired colors (12 options)
const COLORS = [
    '#0a84ff', '#bf5af2', '#ff9f0a', '#ff453a', '#30d158', '#64d2ff',
    '#5e5ce6', '#ff375f', '#ffd60a', '#ac8e68', '#8e8e93', '#ffffff'
];

export default function SemesterPage() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [semester, setSemester] = useState<Semester | null>(null);
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
    const [allDefinitions, setAllDefinitions] = useState<SubjectDefinition[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editSubjectId, setEditSubjectId] = useState<string | null>(null);
    const [modalMode, setModalMode] = useState<'pick' | 'new'>('pick');

    // Form State
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<'GK' | 'LK'>('GK');
    const [formAssess, setFormAssess] = useState<'WRITTEN' | 'ORAL'>('WRITTEN');
    const [formColor, setFormColor] = useState(COLORS[0]);

    // Autocomplete
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const suppressSuggestionsRef = useRef(false);

    useEffect(() => {
        const list = loadSemesters();
        setSemesters(list);
        const found = list.find(s => s.id === id);
        if (!found) return;
        found.subjects = sortSubjects(found.subjects);
        setSemester(found);
        setExpandedSubjectId(null);
        setAllDefinitions(loadSubjectDefinitions());
    }, [id]);

    const filteredSuggestions = useMemo(() => {
        const q = formName.trim().toLowerCase();
        if (!q) return [];
        const defSuggestions = allDefinitions
            .filter(d => d.name.toLowerCase().includes(q))
            .map(d => ({ name: d.name, def: d as SubjectDefinition }));
        const defNames = new Set(defSuggestions.map(s => s.name.toLowerCase()));
        const builtIn = SUBJECT_SUGGESTIONS
            .filter(n => !defNames.has(n.toLowerCase()) && n.toLowerCase().includes(q))
            .map(n => ({ name: n, def: null as null }));
        return [...defSuggestions, ...builtIn].slice(0, 6);
    }, [formName, allDefinitions]);

    useEffect(() => {
        if (suppressSuggestionsRef.current) {
            suppressSuggestionsRef.current = false;
            return;
        }
        setSuggestionIndex(-1);
        setShowSuggestions(filteredSuggestions.length > 0);
    }, [filteredSuggestions]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
                nameInputRef.current && !nameInputRef.current.contains(e.target as Node)
            ) setShowSuggestions(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectSuggestion = (s: { name: string; def: SubjectDefinition | null }) => {
        suppressSuggestionsRef.current = true;
        setFormName(s.name);
        if (s.def) {
            setFormType(s.def.type);
            setFormAssess(s.def.assessmentType);
            if (s.def.color) setFormColor(s.def.color);
        }
        setShowSuggestions(false);
        setSuggestionIndex(-1);
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || filteredSuggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && suggestionIndex >= 0) {
            e.preventDefault();
            selectSuggestion(filteredSuggestions[suggestionIndex]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSuggestionIndex(-1);
        }
    };

    const saveCurrentSemester = (updatedSem: Semester) => {
        const newSemesters = semesters.map(s => s.id === updatedSem.id ? updatedSem : s);
        setSemesters(newSemesters);
        setSemester(updatedSem);
        saveSemesters(newSemesters);
    };

    const openAddModal = () => {
        setEditSubjectId(null);
        setFormName('');
        setFormType('GK');
        setFormAssess('WRITTEN');
        setFormColor(COLORS[0]);
        // Show pick mode if there are definitions not yet in this semester
        const existingIds = new Set(semester?.subjects.map(s => s.id) ?? []);
        const available = allDefinitions.filter(d => !existingIds.has(d.id));
        setModalMode(available.length > 0 ? 'pick' : 'new');
        setIsModalOpen(true);
    };

    const openEditModal = (subject: Subject) => {
        setEditSubjectId(subject.id);
        setFormName(subject.name);
        setFormType(subject.type);
        setFormAssess(subject.assessmentType);
        setFormColor(subject.color || COLORS[0]);
        setIsModalOpen(true);
    };

    const handleSaveSubject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !semester) return;

        if (editSubjectId) {
            let updatedSubjects = semester.subjects.map(s => s.id === editSubjectId ? {
                ...s,
                name: formName.trim(),
                type: formType,
                assessmentType: formAssess,
                color: formColor
            } : s);

            updatedSubjects = sortSubjects(updatedSubjects);
            const updatedSem = { ...semester, subjects: updatedSubjects };
            saveCurrentSemester(updatedSem);
        } else {
            const newSubject: Subject = {
                id: crypto.randomUUID(),
                name: formName.trim(),
                type: formType,
                assessmentType: formAssess,
                quarters: [{ id: 'q1', name: 'Q1' }, { id: 'q2', name: 'Q2' }],
                color: formColor
            };

            const updatedSem = { ...semester, subjects: sortSubjects([...semester.subjects, newSubject]) };
            saveCurrentSemester(updatedSem);
        }

        setAllDefinitions(loadSubjectDefinitions());
        setIsModalOpen(false);
    };

    const addExistingSubject = (def: SubjectDefinition) => {
        if (!semester) return;
        const subject: Subject = {
            ...def,
            quarters: [{ id: 'q1', name: 'Q1' }, { id: 'q2', name: 'Q2' }],
        };
        const updatedSem = { ...semester, subjects: sortSubjects([...semester.subjects, subject]) };
        saveCurrentSemester(updatedSem);
        setIsModalOpen(false);
    };

    const updateSubjectGrades = (updatedSub: Subject) => {
        if (!semester) return;

        let updatedSubjects = semester.subjects.map(s => s.id === updatedSub.id ? updatedSub : s);

        const isTopSubject = semester.subjects.length > 0 && semester.subjects[0].id === updatedSub.id;
        if (!isTopSubject) {
            updatedSubjects = sortSubjects(updatedSubjects);
        }

        const updatedSem = { ...semester, subjects: updatedSubjects };
        saveCurrentSemester(updatedSem);
    };

    const deleteSubject = (subId: string) => {
        if (!semester) return;
        if (!confirm('Fach wirklich löschen?')) return;
        const updatedSem = { ...semester, subjects: semester.subjects.filter(s => s.id !== subId) };
        saveCurrentSemester(updatedSem);
    };

    const handleDeleteSemester = () => {
        if (!confirm('Ganzes Semester löschen?')) return;
        const newSemesters = semesters.filter(s => s.id !== id);
        saveSemesters(newSemesters);
        router.push('/');
    };

    if (!semester) return <div className="flex h-screen items-center justify-center">Lade...</div>;

    const avgPoints = calculateSemesterAverage(semester);
    const avgGrade = avgPoints !== null ? pointsToGrade(avgPoints) : null;

    const q1Avg = calculateQuarterAverage(semester, 0);
    const q2Avg = calculateQuarterAverage(semester, 1);
    const tendency = q1Avg !== null && q2Avg !== null
        ? q2Avg > q1Avg + 0.1 ? 'up' : q2Avg < q1Avg - 0.1 ? 'down' : 'flat'
        : null;

    return (
        <main className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto selection:bg-primary/30">

            {/* Navigation */}
            <nav className="mb-8 flex justify-between items-center">
                <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--glass-hover)] transition-all duration-200 active:scale-90">
                    <ChevronLeft size={18} />
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <button
                        onClick={handleDeleteSemester}
                        className="text-[var(--color-text-muted)] hover:text-danger text-xs font-medium transition-colors duration-200"
                    >
                        Löschen
                    </button>
                </div>
            </nav>

            {/* Hero Header */}
            <header className="mb-12 animate-slide-up">
                <div className="mb-8">
                    <span className="text-[var(--color-text-muted)] font-bold uppercase tracking-widest text-xs mb-2 block">Semester</span>
                    <h1 className="text-5xl font-extrabold text-[var(--color-text)] tracking-tight">{semester.name}</h1>
                </div>

                <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6 md:items-stretch">
                    {avgPoints !== null && avgGrade !== null && (
                        <div className="bg-[var(--glass-bg)] backdrop-blur-xl p-6 rounded-3xl border border-[var(--glass-border)] shadow-2xl flex flex-col justify-center items-center text-center gap-4">
                            <SemesterGradeRing grade={avgGrade} points={avgPoints} />
                            {tendency !== null && q1Avg !== null && q2Avg !== null && (
                                <div className="flex items-center gap-2.5">
                                    <div className="text-center">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">Q1</div>
                                        <div className="text-base font-bold text-[var(--color-text)]">{q1Avg.toFixed(1)}</div>
                                    </div>
                                    <div className={clsx(
                                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                        tendency === 'up' ? 'bg-success/15 text-success' :
                                        tendency === 'down' ? 'bg-danger/15 text-danger' :
                                        'bg-[var(--glass-border)] text-[var(--color-text-muted)]'
                                    )}>
                                        {tendency === 'up' && <TrendingUp size={15} strokeWidth={2.5} />}
                                        {tendency === 'down' && <TrendingDown size={15} strokeWidth={2.5} />}
                                        {tendency === 'flat' && <Minus size={15} strokeWidth={2.5} />}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">Q2</div>
                                        <div className="text-base font-bold text-[var(--color-text)]">{q2Avg.toFixed(1)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(semester.subjects.length > 0) && (
                        <SemesterRadar subjects={semester.subjects} />
                    )}
                </div>
            </header>

            {/* Subjects List */}
            <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up"
                style={{ animationDelay: '0.1s' }}
            >
                {semester.subjects.map(sub => (
                    <div key={sub.id} className="animate-slide-up">
                        <SubjectCard
                            subject={sub}
                            onChange={updateSubjectGrades}
                            onDelete={() => deleteSubject(sub.id)}
                            onEdit={() => openEditModal(sub)}
                            isExpanded={expandedSubjectId === sub.id}
                            onToggleExpand={() =>
                                setExpandedSubjectId(prev => (prev === sub.id ? null : sub.id))
                            }
                        />
                    </div>
                ))}
                {semester.subjects.length === 0 && (
                    <div className="text-center py-12 px-6 rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                        <p className="text-[var(--color-text-muted)]">Noch keine Fächer eingetragen.</p>
                    </div>
                )}
            </div>

            {/* Add Button */}
            <button
                onClick={openAddModal}
                className="w-full mt-8 mb-8 bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-3 rounded-2xl transition-all flex justify-center items-center gap-2 text-sm font-medium active:scale-[0.98]"
            >
                <Plus size={16} strokeWidth={2.5} />
                Fach hinzufügen
            </button>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xl animate-fade-in">
                    <div className="bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] p-6 rounded-3xl shadow-2xl w-full max-w-md animate-scale-in relative" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-[var(--color-text)] mb-6">
                            {editSubjectId ? 'Fach bearbeiten' : 'Fach hinzufügen'}
                        </h3>

                        {/* Pick existing subjects – only shown when adding */}
                        {!editSubjectId && (() => {
                            const existingIds = new Set(semester?.subjects.map(s => s.id) ?? []);
                            const available = allDefinitions.filter(d => !existingIds.has(d.id));
                            if (available.length === 0) return null;
                            return (
                                <div className="mb-6">
                                    {modalMode === 'pick' && (
                                        <>
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-3">Vorhandene Fächer</p>
                                            <div className="flex flex-col gap-2 mb-4">
                                                {available.map(def => (
                                                    <button
                                                        key={def.id}
                                                        type="button"
                                                        onClick={() => addExistingSubject(def)}
                                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--input-bg)] hover:bg-[var(--glass-hover)] border border-[var(--glass-border)] text-left transition-all active:scale-[0.98]"
                                                    >
                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white/90 shrink-0" style={{ backgroundColor: def.color || '#333' }}>
                                                            {def.type}
                                                        </div>
                                                        <span className="font-medium text-[var(--color-text)]">{def.name}</span>
                                                        <span className="ml-auto text-xs text-[var(--color-text-muted)]">{def.assessmentType === 'WRITTEN' ? 'Schriftl.' : 'Mündl.'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setModalMode('new')}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--glass-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--glass-hover)] text-sm font-medium transition-all"
                                            >
                                                <Plus size={14} strokeWidth={2.5} />
                                                Neues Fach erstellen
                                            </button>
                                        </>
                                    )}
                                    {modalMode === 'new' && (
                                        <button
                                            type="button"
                                            onClick={() => setModalMode('pick')}
                                            className="text-xs text-primary font-medium mb-4 flex items-center gap-1 hover:underline"
                                        >
                                            ← Zurück zur Auswahl
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        {/* New subject form – shown in edit mode or when modalMode === 'new' */}
                        {(editSubjectId || modalMode === 'new' || allDefinitions.filter(d => !new Set(semester?.subjects.map(s => s.id) ?? []).has(d.id)).length === 0) && (
                        <form onSubmit={handleSaveSubject} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Fachname</label>
                                <div className="relative">
                                    <input
                                        ref={nameInputRef}
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        onFocus={() => filteredSuggestions.length > 0 && setShowSuggestions(true)}
                                        onKeyDown={handleNameKeyDown}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--color-text)] focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                        placeholder="z.B. Englisch"
                                        autoComplete="off"
                                        autoFocus
                                    />
                                    {showSuggestions && (
                                        <div
                                            ref={suggestionsRef}
                                            className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--color-surface)] border border-[var(--glass-border)] rounded-xl shadow-2xl overflow-hidden animate-scale-in"
                                        >
                                            {filteredSuggestions.map((s, i) => (
                                                <button
                                                    key={s.name}
                                                    type="button"
                                                    onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                                                    className={clsx(
                                                        'w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors',
                                                        i === suggestionIndex
                                                            ? 'bg-primary/15 text-primary'
                                                            : 'text-[var(--color-text)] hover:bg-[var(--glass-hover)]'
                                                    )}
                                                >
                                                    {s.def ? (
                                                        <div
                                                            className="w-5 h-5 rounded-md text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0"
                                                            style={{ backgroundColor: s.def.color || '#555' }}
                                                        >
                                                            {s.def.type}
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-md bg-[var(--glass-border)] flex-shrink-0" />
                                                    )}
                                                    <span className="font-medium flex-1">{s.name}</span>
                                                    {s.def && (
                                                        <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
                                                            {s.def.assessmentType === 'WRITTEN' ? 'Schriftl.' : 'Mündl.'}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Kursart</label>
                                    <div className="flex bg-[var(--input-bg)] p-1 rounded-xl">
                                        <button type="button" onClick={() => setFormType('GK')} className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all", formType === 'GK' ? 'bg-[var(--color-surface-highlight)] text-[var(--color-text)] shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>GK</button>
                                        <button type="button" onClick={() => setFormType('LK')} className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all", formType === 'LK' ? 'bg-primary text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>LK</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Bewertung</label>
                                    <div className="flex bg-[var(--input-bg)] p-1 rounded-xl">
                                        <button type="button" onClick={() => setFormAssess('WRITTEN')} className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all", formAssess === 'WRITTEN' ? 'bg-[var(--color-surface-highlight)] text-[var(--color-text)] shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>Schriftlich</button>
                                        <button type="button" onClick={() => setFormAssess('ORAL')} className={clsx("flex-1 py-2 rounded-lg text-xs font-bold transition-all", formAssess === 'ORAL' ? 'bg-[var(--color-surface-highlight)] text-[var(--color-text)] shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>Mündlich</button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Farbe</label>
                                <div className="grid grid-cols-6 gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFormColor(c)}
                                            className={clsx("w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all mx-auto", formColor === c ? "border-[var(--color-text)] scale-110" : "border-transparent opacity-50 hover:opacity-100")}
                                            style={{ backgroundColor: c }}
                                        >
                                            {formColor === c && <Check size={14} className={c === '#ffffff' ? 'text-black' : 'text-white'} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-primary text-white hover:bg-primary/90 py-3 rounded-xl font-bold transition-all transform active:scale-[0.98]">
                                Speichern
                            </button>

                            {editSubjectId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        deleteSubject(editSubjectId);
                                        setIsModalOpen(false);
                                    }}
                                    className="w-full bg-danger/10 text-danger hover:bg-danger/20 py-3 rounded-xl font-bold transition-all transform active:scale-[0.98]"
                                >
                                    Fach löschen
                                </button>
                            )}
                        </form>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
