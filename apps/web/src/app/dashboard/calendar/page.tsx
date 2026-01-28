'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Clock, MapPin, Users, X, Save, Video, Link2, Repeat
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';

interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    isAllDay?: boolean;
    recurrence?: string;
    attendees?: string[];
    color?: string;
    reminders?: number[];
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function CalendarPage() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'month' | 'week' | 'day'>('month');
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    /**
     * Calendar Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchEvents = useCallback(async () => {
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const data = await apiClient.get<any>(
                `/calendar/events?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`
            );

            setEvents(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const getEventsForDate = (date: Date) => {
        return events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate.toDateString() === date.toDateString();
        });
    };

    const navigateMonth = (direction: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
        try {
            if (editingEvent) {
                await apiClient.put(`/calendar/events/${editingEvent.id}`, eventData);
            } else {
                await apiClient.post('/calendar/events', eventData);
            }
            fetchEvents();
            setShowEventModal(false);
            setEditingEvent(null);
        } catch (error) {
            console.error('Erro ao salvar evento:', error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este evento?')) return;

        try {
            await apiClient.delete(`/calendar/events/${id}`);
            fetchEvents();
        } catch (error) {
            console.error('Erro ao excluir evento:', error);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date: Date) => {
        return date.toDateString() === selectedDate.toDateString();
    };

    const days = getDaysInMonth(currentDate);
    const selectedDateEvents = getEventsForDate(selectedDate);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Calendário</h1>
                    <p>Gerencie seus eventos e compromissos</p>
                </div>
                <button
                    className={styles.addButton}
                    onClick={() => {
                        setEditingEvent(null);
                        setShowEventModal(true);
                    }}
                >
                    <Plus size={20} />
                    Novo Evento
                </button>
            </header>

            <div className={styles.calendarContainer}>
                <div className={styles.calendarMain}>
                    <div className={styles.calendarHeader}>
                        <div className={styles.monthNavigation}>
                            <button onClick={() => navigateMonth(-1)}>
                                <ChevronLeft size={20} />
                            </button>
                            <h2>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                            <button onClick={() => navigateMonth(1)}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className={styles.viewControls}>
                            <button onClick={goToToday} className={styles.todayBtn}>
                                Hoje
                            </button>
                            <div className={styles.viewTabs}>
                                <button
                                    className={view === 'month' ? styles.active : ''}
                                    onClick={() => setView('month')}
                                >
                                    Mês
                                </button>
                                <button
                                    className={view === 'week' ? styles.active : ''}
                                    onClick={() => setView('week')}
                                >
                                    Semana
                                </button>
                                <button
                                    className={view === 'day' ? styles.active : ''}
                                    onClick={() => setView('day')}
                                >
                                    Dia
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.calendarGrid}>
                        {DAYS.map(day => (
                            <div key={day} className={styles.dayHeader}>
                                {day}
                            </div>
                        ))}
                        {days.map((date, index) => (
                            <div
                                key={index}
                                className={`${styles.dayCell} ${!date ? styles.empty : ''} ${date && isToday(date) ? styles.today : ''} ${date && isSelected(date) ? styles.selected : ''}`}
                                onClick={() => date && setSelectedDate(date)}
                            >
                                {date && (
                                    <>
                                        <span className={styles.dayNumber}>{date.getDate()}</span>
                                        <div className={styles.dayEvents}>
                                            {getEventsForDate(date).slice(0, 3).map(event => (
                                                <div
                                                    key={event.id}
                                                    className={styles.eventDot}
                                                    style={{ backgroundColor: event.color || '#3b82f6' }}
                                                    title={event.title}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h3>
                            {selectedDate.toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            })}
                        </h3>
                    </div>

                    <div className={styles.eventsList}>
                        {selectedDateEvents.length === 0 ? (
                            <div className={styles.noEvents}>
                                <CalendarIcon size={32} />
                                <p>Nenhum evento neste dia</p>
                                <button onClick={() => {
                                    setEditingEvent(null);
                                    setShowEventModal(true);
                                }}>
                                    Criar evento
                                </button>
                            </div>
                        ) : (
                            selectedDateEvents.map(event => (
                                <div
                                    key={event.id}
                                    className={styles.eventCard}
                                    onClick={() => {
                                        setEditingEvent(event);
                                        setShowEventModal(true);
                                    }}
                                >
                                    <div
                                        className={styles.eventColor}
                                        style={{ backgroundColor: event.color || '#3b82f6' }}
                                    />
                                    <div className={styles.eventInfo}>
                                        <h4>{event.title}</h4>
                                        <div className={styles.eventMeta}>
                                            <span>
                                                <Clock size={14} />
                                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                            </span>
                                            {event.location && (
                                                <span>
                                                    <MapPin size={14} />
                                                    {event.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Event Modal */}
            {showEventModal && (
                <EventModal
                    event={editingEvent}
                    selectedDate={selectedDate}
                    onClose={() => {
                        setShowEventModal(false);
                        setEditingEvent(null);
                    }}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                />
            )}
        </div>
    );
}

// Event Modal Component
function EventModal({ event, selectedDate, onClose, onSave, onDelete }: {
    event?: CalendarEvent | null;
    selectedDate: Date;
    onClose: () => void;
    onSave: (data: Partial<CalendarEvent>) => void;
    onDelete: (id: string) => void;
}) {
    const defaultStart = new Date(selectedDate);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(selectedDate);
    defaultEnd.setHours(10, 0, 0, 0);

    const [title, setTitle] = useState(event?.title || '');
    const [description, setDescription] = useState(event?.description || '');
    const [startTime, setStartTime] = useState(
        event?.startTime ? new Date(event.startTime).toISOString().slice(0, 16) :
            defaultStart.toISOString().slice(0, 16)
    );
    const [endTime, setEndTime] = useState(
        event?.endTime ? new Date(event.endTime).toISOString().slice(0, 16) :
            defaultEnd.toISOString().slice(0, 16)
    );
    const [location, setLocation] = useState(event?.location || '');
    const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false);
    const [color, setColor] = useState(event?.color || '#3b82f6');

    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            description: description || undefined,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            location: location || undefined,
            isAllDay,
            color
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{event ? 'Editar Evento' : 'Novo Evento'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Adicionar título"
                                required
                                autoFocus
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={isAllDay}
                                    onChange={e => setIsAllDay(e.target.checked)}
                                />
                                Dia inteiro
                            </label>
                        </div>

                        {!isAllDay && (
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Início</label>
                                    <input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Término</label>
                                    <input
                                        type="datetime-local"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>Local</label>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Adicionar local"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Descrição</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Adicionar descrição"
                                rows={3}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Cor</label>
                            <div className={styles.colorPicker}>
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`${styles.colorOption} ${color === c ? styles.selected : ''}`}
                                        style={{ backgroundColor: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        {event && (
                            <button
                                type="button"
                                className={styles.btnDanger}
                                onClick={() => {
                                    onDelete(event.id);
                                    onClose();
                                }}
                            >
                                Excluir
                            </button>
                        )}
                        <div className={styles.footerRight}>
                            <button type="button" onClick={onClose} className={styles.btnSecondary}>
                                Cancelar
                            </button>
                            <button type="submit" className={styles.btnPrimary}>
                                <Save size={18} />
                                Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
