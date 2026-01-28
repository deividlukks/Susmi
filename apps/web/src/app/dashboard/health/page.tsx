'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Heart, Activity, Pill, Dumbbell, Scale, Droplets,
    Moon, TrendingUp, Calendar, Clock, X, Save, Check
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';
import { formatDate as formatDateUtil } from '@/lib/formatters';

interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    times: string[];
    startDate: string;
    endDate?: string;
    stock?: number;
    notes?: string;
}

interface Workout {
    id: string;
    exerciseTypeId: string;
    exerciseType?: { name: string; icon: string };
    date: string;
    duration?: number;
    distance?: number;
    calories?: number;
    notes?: string;
}

interface HealthMetric {
    id: string;
    type: string;
    value: number;
    unit: string;
    recordedAt: string;
}

interface ExerciseType {
    id: string;
    name: string;
    category: string;
    icon: string;
}

type TabType = 'overview' | 'medications' | 'workouts' | 'metrics';

export default function HealthPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [metrics, setMetrics] = useState<HealthMetric[]>([]);
    const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([]);
    const [todaySchedule, setTodaySchedule] = useState<any[]>([]);

    const [showMedicationModal, setShowMedicationModal] = useState(false);
    const [showWorkoutModal, setShowWorkoutModal] = useState(false);
    const [showMetricModal, setShowMetricModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    /**
     * Health Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchData = useCallback(async () => {
        try {
            const [medsData, workoutsData, metricsData, typesData, scheduleData] = await Promise.all([
                apiClient.get<any>('/wellness/medications'),
                apiClient.get<any>('/wellness/workouts?limit=20'),
                apiClient.get<any>('/wellness/metrics?limit=50'),
                apiClient.get<any>('/wellness/exercises/types'),
                apiClient.get<any>('/wellness/medications/schedule/today')
            ]);

            setMedications(Array.isArray(medsData) ? medsData : medsData.data || []);
            setWorkouts(Array.isArray(workoutsData) ? workoutsData : workoutsData.data || []);
            setMetrics(Array.isArray(metricsData) ? metricsData : metricsData.data || []);
            setExerciseTypes(Array.isArray(typesData) ? typesData : typesData.data || []);
            setTodaySchedule(Array.isArray(scheduleData) ? scheduleData : scheduleData.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados de saúde:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveMedication = async (data: Partial<Medication>) => {
        try {
            if (editingItem) {
                await apiClient.put(`/wellness/medications/${editingItem.id}`, data);
            } else {
                await apiClient.post('/wellness/medications', data);
            }
            fetchData();
            setShowMedicationModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Erro ao salvar medicamento:', error);
        }
    };

    const handleSaveWorkout = async (data: Partial<Workout>) => {
        try {
            if (editingItem) {
                await apiClient.put(`/wellness/workouts/${editingItem.id}`, data);
            } else {
                await apiClient.post('/wellness/workouts', data);
            }
            fetchData();
            setShowWorkoutModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Erro ao salvar treino:', error);
        }
    };

    const handleSaveMetric = async (data: Partial<HealthMetric>) => {
        try {
            await apiClient.post('/wellness/metrics', data);
            fetchData();
            setShowMetricModal(false);
        } catch (error) {
            console.error('Erro ao salvar métrica:', error);
        }
    };

    const logMedicationTaken = async (medicationId: string, time: string) => {
        try {
            await apiClient.post(`/wellness/medications/${medicationId}/log`, { time, taken: true });
            fetchData();
        } catch (error) {
            console.error('Erro ao registrar medicamento:', error);
        }
    };

    const getLatestMetric = (type: string) => {
        return metrics.find(m => m.type === type);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando dados de saúde...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Saúde & Bem-estar</h1>
                    <p>Acompanhe sua saúde, medicamentos e exercícios</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.secondaryButton}
                        onClick={() => setShowMetricModal(true)}
                    >
                        <Activity size={20} />
                        Registrar Métrica
                    </button>
                    <button
                        className={styles.addButton}
                        onClick={() => {
                            setEditingItem(null);
                            setShowWorkoutModal(true);
                        }}
                    >
                        <Plus size={20} />
                        Novo Treino
                    </button>
                </div>
            </header>

            {/* Quick Stats */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.red}`}>
                        <Heart size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {getLatestMetric('HEART_RATE')?.value || '--'} bpm
                        </span>
                        <span className={styles.statLabel}>Frequência Cardíaca</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.blue}`}>
                        <Scale size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {getLatestMetric('WEIGHT')?.value || '--'} kg
                        </span>
                        <span className={styles.statLabel}>Peso</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.purple}`}>
                        <Moon size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {getLatestMetric('SLEEP')?.value || '--'} h
                        </span>
                        <span className={styles.statLabel}>Sono (última noite)</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.green}`}>
                        <Dumbbell size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {workouts.filter(w =>
                                new Date(w.date).toDateString() === new Date().toDateString()
                            ).length}
                        </span>
                        <span className={styles.statLabel}>Treinos Hoje</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {[
                    { id: 'overview', label: 'Visão Geral', icon: Heart },
                    { id: 'medications', label: 'Medicamentos', icon: Pill },
                    { id: 'workouts', label: 'Exercícios', icon: Dumbbell },
                    { id: 'metrics', label: 'Métricas', icon: Activity },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id as TabType)}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                    <div className={styles.overviewGrid}>
                        {/* Today's Schedule */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Medicamentos de Hoje</h2>
                                <button onClick={() => setShowMedicationModal(true)}>
                                    <Plus size={16} /> Adicionar
                                </button>
                            </div>
                            <div className={styles.scheduleList}>
                                {todaySchedule.length === 0 ? (
                                    <p className={styles.emptyText}>Nenhum medicamento agendado para hoje</p>
                                ) : (
                                    todaySchedule.map((item, index) => (
                                        <div key={index} className={styles.scheduleItem}>
                                            <div className={styles.scheduleTime}>
                                                <Clock size={16} />
                                                {item.time}
                                            </div>
                                            <div className={styles.scheduleInfo}>
                                                <span className={styles.medName}>{item.medication?.name}</span>
                                                <span className={styles.medDosage}>{item.medication?.dosage}</span>
                                            </div>
                                            <button
                                                className={`${styles.checkButton} ${item.taken ? styles.checked : ''}`}
                                                onClick={() => !item.taken && logMedicationTaken(item.medicationId, item.time)}
                                            >
                                                <Check size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Workouts */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Treinos Recentes</h2>
                                <button onClick={() => setActiveTab('workouts')}>Ver todos</button>
                            </div>
                            <div className={styles.workoutsList}>
                                {workouts.slice(0, 5).map(workout => (
                                    <div key={workout.id} className={styles.workoutItem}>
                                        <div className={styles.workoutIcon}>
                                            <Dumbbell size={20} />
                                        </div>
                                        <div className={styles.workoutInfo}>
                                            <span className={styles.workoutName}>
                                                {workout.exerciseType?.name || 'Exercício'}
                                            </span>
                                            <span className={styles.workoutMeta}>
                                                {formatDateUtil(workout.date)}
                                                {workout.duration && ` • ${workout.duration} min`}
                                                {workout.calories && ` • ${workout.calories} kcal`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {workouts.length === 0 && (
                                    <p className={styles.emptyText}>Nenhum treino registrado</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'medications' && (
                    <div className={styles.medicationsTab}>
                        <div className={styles.medicationsGrid}>
                            {medications.map(med => (
                                <div key={med.id} className={styles.medicationCard}>
                                    <div className={styles.medCardHeader}>
                                        <Pill size={24} />
                                        <span className={styles.medFrequency}>{med.frequency}</span>
                                    </div>
                                    <h3>{med.name}</h3>
                                    <p className={styles.medDosage}>{med.dosage}</p>
                                    <div className={styles.medTimes}>
                                        {med.times?.map((time, i) => (
                                            <span key={i} className={styles.timeTag}>{time}</span>
                                        ))}
                                    </div>
                                    {med.stock !== undefined && (
                                        <div className={styles.medStock}>
                                            <span>Estoque: {med.stock} unidades</span>
                                            {med.stock < 10 && (
                                                <span className={styles.lowStock}>Baixo estoque</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                className={styles.addMedCard}
                                onClick={() => {
                                    setEditingItem(null);
                                    setShowMedicationModal(true);
                                }}
                            >
                                <Plus size={32} />
                                <span>Adicionar Medicamento</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'workouts' && (
                    <div className={styles.workoutsTab}>
                        <div className={styles.workoutsGrid}>
                            {workouts.map(workout => (
                                <div key={workout.id} className={styles.workoutCard}>
                                    <div className={styles.workoutCardHeader}>
                                        <div className={styles.workoutTypeIcon}>
                                            <Dumbbell size={24} />
                                        </div>
                                        <span className={styles.workoutDate}>
                                            {formatDateUtil(workout.date)}
                                        </span>
                                    </div>
                                    <h3>{workout.exerciseType?.name || 'Exercício'}</h3>
                                    <div className={styles.workoutStats}>
                                        {workout.duration && (
                                            <div className={styles.workoutStat}>
                                                <Clock size={16} />
                                                <span>{workout.duration} min</span>
                                            </div>
                                        )}
                                        {workout.distance && (
                                            <div className={styles.workoutStat}>
                                                <TrendingUp size={16} />
                                                <span>{workout.distance} km</span>
                                            </div>
                                        )}
                                        {workout.calories && (
                                            <div className={styles.workoutStat}>
                                                <Activity size={16} />
                                                <span>{workout.calories} kcal</span>
                                            </div>
                                        )}
                                    </div>
                                    {workout.notes && (
                                        <p className={styles.workoutNotes}>{workout.notes}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'metrics' && (
                    <div className={styles.metricsTab}>
                        <div className={styles.metricsGrid}>
                            {[
                                { type: 'WEIGHT', label: 'Peso', unit: 'kg', icon: Scale },
                                { type: 'HEART_RATE', label: 'Frequência Cardíaca', unit: 'bpm', icon: Heart },
                                { type: 'BLOOD_PRESSURE', label: 'Pressão Arterial', unit: 'mmHg', icon: Activity },
                                { type: 'SLEEP', label: 'Sono', unit: 'horas', icon: Moon },
                                { type: 'WATER', label: 'Água', unit: 'ml', icon: Droplets },
                            ].map(metric => {
                                const latest = getLatestMetric(metric.type);
                                const Icon = metric.icon;
                                return (
                                    <div key={metric.type} className={styles.metricCard}>
                                        <div className={styles.metricIcon}>
                                            <Icon size={24} />
                                        </div>
                                        <h3>{metric.label}</h3>
                                        <span className={styles.metricValue}>
                                            {latest?.value || '--'} {metric.unit}
                                        </span>
                                        {latest && (
                                            <span className={styles.metricDate}>
                                                {formatDateUtil(latest.recordedAt)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showMedicationModal && (
                <MedicationModal
                    medication={editingItem}
                    onClose={() => {
                        setShowMedicationModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveMedication}
                />
            )}

            {showWorkoutModal && (
                <WorkoutModal
                    workout={editingItem}
                    exerciseTypes={exerciseTypes}
                    onClose={() => {
                        setShowWorkoutModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveWorkout}
                />
            )}

            {showMetricModal && (
                <MetricModal
                    onClose={() => setShowMetricModal(false)}
                    onSave={handleSaveMetric}
                />
            )}
        </div>
    );
}

// Medication Modal
function MedicationModal({ medication, onClose, onSave }: {
    medication?: Medication | null;
    onClose: () => void;
    onSave: (data: Partial<Medication>) => void;
}) {
    const [name, setName] = useState(medication?.name || '');
    const [dosage, setDosage] = useState(medication?.dosage || '');
    const [frequency, setFrequency] = useState(medication?.frequency || 'DAILY');
    const [times, setTimes] = useState<string[]>(medication?.times || ['08:00']);
    const [stock, setStock] = useState(medication?.stock?.toString() || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            dosage,
            frequency,
            times,
            stock: stock ? parseInt(stock) : undefined,
            startDate: new Date().toISOString()
        });
    };

    const addTime = () => setTimes([...times, '12:00']);
    const removeTime = (index: number) => setTimes(times.filter((_, i) => i !== index));
    const updateTime = (index: number, value: string) => {
        const newTimes = [...times];
        newTimes[index] = value;
        setTimes(newTimes);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{medication ? 'Editar Medicamento' : 'Novo Medicamento'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Nome do Medicamento</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Dipirona"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Dosagem</label>
                                <input
                                    type="text"
                                    value={dosage}
                                    onChange={e => setDosage(e.target.value)}
                                    placeholder="Ex: 500mg"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Frequência</label>
                                <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                                    <option value="DAILY">Diário</option>
                                    <option value="WEEKLY">Semanal</option>
                                    <option value="AS_NEEDED">Quando necessário</option>
                                </select>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Horários</label>
                            <div className={styles.timesList}>
                                {times.map((time, index) => (
                                    <div key={index} className={styles.timeInput}>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={e => updateTime(index, e.target.value)}
                                        />
                                        {times.length > 1 && (
                                            <button type="button" onClick={() => removeTime(index)}>
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addTime} className={styles.addTimeBtn}>
                                    <Plus size={16} /> Adicionar horário
                                </button>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Estoque (opcional)</label>
                            <input
                                type="number"
                                value={stock}
                                onChange={e => setStock(e.target.value)}
                                placeholder="Quantidade em estoque"
                            />
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Save size={18} />
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Workout Modal
function WorkoutModal({ workout, exerciseTypes, onClose, onSave }: {
    workout?: Workout | null;
    exerciseTypes: ExerciseType[];
    onClose: () => void;
    onSave: (data: Partial<Workout>) => void;
}) {
    const [exerciseTypeId, setExerciseTypeId] = useState(workout?.exerciseTypeId || '');
    const [date, setDate] = useState(workout?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    const [duration, setDuration] = useState(workout?.duration?.toString() || '');
    const [distance, setDistance] = useState(workout?.distance?.toString() || '');
    const [calories, setCalories] = useState(workout?.calories?.toString() || '');
    const [notes, setNotes] = useState(workout?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            exerciseTypeId,
            date: new Date(date).toISOString(),
            duration: duration ? parseInt(duration) : undefined,
            distance: distance ? parseFloat(distance) : undefined,
            calories: calories ? parseInt(calories) : undefined,
            notes: notes || undefined
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{workout ? 'Editar Treino' : 'Novo Treino'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Tipo de Exercício</label>
                            <select
                                value={exerciseTypeId}
                                onChange={e => setExerciseTypeId(e.target.value)}
                                required
                            >
                                <option value="">Selecione...</option>
                                {exerciseTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Data</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Duração (min)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Distância (km)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={distance}
                                    onChange={e => setDistance(e.target.value)}
                                    placeholder="0.0"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Calorias</label>
                                <input
                                    type="number"
                                    value={calories}
                                    onChange={e => setCalories(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Observações</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Anotações sobre o treino..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Save size={18} />
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Metric Modal
function MetricModal({ onClose, onSave }: {
    onClose: () => void;
    onSave: (data: Partial<HealthMetric>) => void;
}) {
    const [type, setType] = useState('WEIGHT');
    const [value, setValue] = useState('');

    const metricTypes = [
        { value: 'WEIGHT', label: 'Peso', unit: 'kg' },
        { value: 'HEART_RATE', label: 'Frequência Cardíaca', unit: 'bpm' },
        { value: 'BLOOD_PRESSURE_SYSTOLIC', label: 'Pressão Sistólica', unit: 'mmHg' },
        { value: 'BLOOD_PRESSURE_DIASTOLIC', label: 'Pressão Diastólica', unit: 'mmHg' },
        { value: 'SLEEP', label: 'Horas de Sono', unit: 'horas' },
        { value: 'WATER', label: 'Água Consumida', unit: 'ml' },
        { value: 'STEPS', label: 'Passos', unit: 'passos' },
    ];

    const currentMetric = metricTypes.find(m => m.value === type);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            type,
            value: parseFloat(value),
            unit: currentMetric?.unit || '',
            recordedAt: new Date().toISOString()
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Registrar Métrica</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Tipo de Métrica</label>
                            <select value={type} onChange={e => setType(e.target.value)}>
                                {metricTypes.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Valor ({currentMetric?.unit})</label>
                            <input
                                type="number"
                                step="0.1"
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder={`Valor em ${currentMetric?.unit}`}
                                required
                            />
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Save size={18} />
                            Registrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
