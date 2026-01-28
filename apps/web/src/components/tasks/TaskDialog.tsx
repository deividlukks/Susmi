'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import styles from './TaskDialog.module.css';
import { TaskStatus, TaskPriority } from '@susmi/shared/enums';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
}

interface TaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => Promise<void>;
    task?: Task | null; // Se fornecido, é modo de edição
}

const PRIORITIES = [
    { value: TaskPriority.LOW, label: 'Baixa', color: '#22c55e' },
    { value: TaskPriority.MEDIUM, label: 'Média', color: '#eab308' },
    { value: TaskPriority.HIGH, label: 'Alta', color: '#f97316' },
    { value: TaskPriority.URGENT, label: 'Urgente', color: '#ef4444' },
];

export default function TaskDialog({ isOpen, onClose, onSave, task }: TaskDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority(task.priority);
            // Formatar data para input datetime-local (YYYY-MM-DDTHH:mm)
            if (task.dueDate) {
                const date = new Date(task.dueDate);
                const isoString = date.toISOString().slice(0, 16);
                setDueDate(isoString);
            } else {
                setDueDate('');
            }
        } else {
            setTitle('');
            setDescription('');
            setPriority(TaskPriority.MEDIUM);
            setDueDate('');
        }
    }, [task, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            await onSave({
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
            });
            onClose();
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
            // Aqui poderia ter um toast de erro
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="title">Título</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="O que precisa ser feito?"
                            className={styles.input}
                            autoFocus
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="description">Descrição (opcional)</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Adicione detalhes..."
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="priority">Prioridade</label>
                            <div className={styles.selectWrapper}>
                                <select
                                    id="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                                    className={styles.select}
                                >
                                    {PRIORITIES.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="dueDate">Prazo</label>
                            <input
                                id="dueDate"
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <footer className={styles.footer}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading || !title.trim()}
                        >
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save size={18} />
                                    {task ? 'Salvar Alterações' : 'Criar Tarefa'}
                                </>
                            )}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
