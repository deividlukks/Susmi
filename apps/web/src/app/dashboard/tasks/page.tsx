'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, Trash2, Clock, AlertCircle, Edit2, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import TaskDialog from '@/components/tasks/TaskDialog';
import { apiClient } from '@/lib/api-client';
import { TaskStatus, TaskPriority } from '@susmi/shared/enums';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
    LOW: { label: 'Baixa', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
    MEDIUM: { label: 'Média', color: '#ca8a04', bg: 'rgba(202, 138, 4, 0.1)' },
    HIGH: { label: 'Alta', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
    URGENT: { label: 'Urgente', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
};

/**
 * Tasks Page - Refatorado com DRY
 *
 * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
 * USA TIPOS COMPARTILHADOS: TaskStatus e TaskPriority de @susmi/shared
 */
export default function TasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            // apiClient já gerencia autenticação e redireciona se 401
            const data = await apiClient.get<any>('/tasks');
            // A API retorna { data: [], meta: {} }
            setTasks(data.data || data);
        } catch (error) {
            console.error('Erro ao carregar tarefas:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleSaveTask = async (taskData: Partial<Task>) => {
        try {
            if (editingTask) {
                // Atualizar tarefa existente
                await apiClient.put(`/tasks/${editingTask.id}`, taskData);
            } else {
                // Criar nova tarefa
                await apiClient.post('/tasks', taskData);
            }
            await fetchTasks(); // Recarregar lista
        } catch (error) {
            console.error('Erro ao salvar tarefa:', error);
        }
    };

    const toggleTask = async (task: Task) => {
        try {
            // Otimistic update
            setTasks(prev => prev.map(t =>
                t.id === task.id
                    ? { ...t, status: t.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED }
                    : t
            ));

            await apiClient.patch(`/tasks/${task.id}/toggle`, {});
        } catch (error) {
            // Reverter em caso de erro
            fetchTasks();
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

        try {
            setTasks(prev => prev.filter(t => t.id !== id)); // Optimistic UI
            await apiClient.delete(`/tasks/${id}`);
        } catch (error) {
            // Reverter em caso de erro
            fetchTasks();
        }
    };

    const openNewTaskDialog = () => {
        setEditingTask(null);
        setIsDialogOpen(true);
    };

    const openEditTaskDialog = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const isOverdue = (dateString?: string, status?: TaskStatus) => {
        if (!dateString || status === TaskStatus.COMPLETED) return false;
        return new Date(dateString) < new Date();
    };

    const formatDueDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const pendingTasks = tasks.filter((t) => t.status !== TaskStatus.COMPLETED);
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED);

    if (loading && tasks.length === 0) {
        return <div className={styles.container}><p>Carregando tarefas...</p></div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Tarefas</h1>
                    <p>{pendingTasks.length} pendentes, {completedTasks.length} concluídas</p>
                </div>
                <button
                    onClick={openNewTaskDialog}
                    className={styles.addButton}
                >
                    <Plus size={20} />
                    Nova Tarefa
                </button>
            </header>

            <TaskDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleSaveTask}
                task={editingTask}
            />

            <section className={styles.section}>
                <h2>Pendentes</h2>
                <div className={styles.taskList}>
                    {pendingTasks.length === 0 ? (
                        <p className={styles.emptyState}>Nenhuma tarefa pendente 🎉</p>
                    ) : (
                        pendingTasks.map((task) => {
                            const overdue = isOverdue(task.dueDate, task.status);
                            const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

                            return (
                                <div key={task.id} className={`${styles.taskCard} ${overdue ? styles.overdue : ''}`}>
                                    <button
                                        onClick={() => toggleTask(task)}
                                        className={styles.checkbox}
                                    >
                                        {task.status === TaskStatus.COMPLETED && <Check size={16} />}
                                    </button>

                                    <div className={styles.taskContent} onClick={() => openEditTaskDialog(task)}>
                                        <div className={styles.titleRow}>
                                            <h3>{task.title}</h3>
                                            {overdue && (
                                                <span className={styles.overdueBadge}>Atrasada</span>
                                            )}
                                        </div>

                                        {task.description && <p className={styles.description}>{task.description}</p>}

                                        <div className={styles.taskMeta}>
                                            <span
                                                className={styles.priorityBadge}
                                                style={{ color: priority.color, backgroundColor: priority.bg }}
                                            >
                                                <AlertCircle size={14} />
                                                {priority.label}
                                            </span>

                                            {task.dueDate && (
                                                <span className={`${styles.dueDate} ${overdue ? styles.textOverdue : ''}`}>
                                                    <Clock size={14} />
                                                    {formatDueDate(task.dueDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => openEditTaskDialog(task)}
                                            className={styles.actionButton}
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id)}
                                            className={`${styles.actionButton} ${styles.deleteButton}`}
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {completedTasks.length > 0 && (
                <section className={styles.section}>
                    <h2>Concluídas</h2>
                    <div className={styles.taskList}>
                        {completedTasks.map((task) => (
                            <div key={task.id} className={`${styles.taskCard} ${styles.completed}`}>
                                <button
                                    onClick={() => toggleTask(task)}
                                    className={`${styles.checkbox} ${styles.checked}`}
                                >
                                    <Check size={16} />
                                </button>

                                <div className={styles.taskContent}>
                                    <h3>{task.title}</h3>
                                </div>

                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
