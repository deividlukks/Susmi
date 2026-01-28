'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Zap, Play, Pause, Plus, X, Clock, Calendar, Mail, MessageSquare,
    Bell, ArrowRight, Trash2, Settings, Edit, Copy, Activity,
    CheckCircle, XCircle, AlertTriangle, RefreshCw, ChevronDown
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';

interface Trigger {
    type: 'schedule' | 'event' | 'webhook' | 'manual';
    config: Record<string, any>;
}

interface Action {
    id: string;
    type: 'email' | 'notification' | 'task' | 'webhook' | 'delay' | 'condition';
    config: Record<string, any>;
}

interface Workflow {
    id: string;
    name: string;
    description?: string;
    trigger: Trigger;
    actions: Action[];
    isEnabled: boolean;
    lastRun?: string;
    runCount: number;
    status: 'active' | 'paused' | 'error';
    createdAt: string;
}

interface ExecutionLog {
    id: string;
    workflowId: string;
    workflowName: string;
    status: 'success' | 'failed' | 'running';
    startedAt: string;
    completedAt?: string;
    duration?: number;
    error?: string;
}

type Tab = 'workflows' | 'logs' | 'templates';

const TRIGGER_TYPES = [
    { value: 'schedule', label: 'Agendamento', icon: Clock, description: 'Execute em horários específicos' },
    { value: 'event', label: 'Evento', icon: Zap, description: 'Quando algo acontecer no sistema' },
    { value: 'webhook', label: 'Webhook', icon: Activity, description: 'Chamada HTTP externa' },
    { value: 'manual', label: 'Manual', icon: Play, description: 'Executar manualmente' },
];

const ACTION_TYPES = [
    { value: 'email', label: 'Enviar Email', icon: Mail },
    { value: 'notification', label: 'Notificação', icon: Bell },
    { value: 'task', label: 'Criar Tarefa', icon: CheckCircle },
    { value: 'webhook', label: 'Chamar Webhook', icon: Activity },
    { value: 'delay', label: 'Aguardar', icon: Clock },
    { value: 'condition', label: 'Condição', icon: ArrowRight },
];

const WORKFLOW_TEMPLATES = [
    {
        id: 'daily-summary',
        name: 'Resumo Diário',
        description: 'Envie um resumo das tarefas e eventos do dia',
        trigger: { type: 'schedule', config: { cron: '0 8 * * *' } },
        actions: [{ id: '1', type: 'email', config: { template: 'daily-summary' } }],
    },
    {
        id: 'task-reminder',
        name: 'Lembrete de Tarefas',
        description: 'Notifique sobre tarefas próximas do prazo',
        trigger: { type: 'schedule', config: { cron: '0 9 * * *' } },
        actions: [{ id: '1', type: 'notification', config: { type: 'task-due' } }],
    },
    {
        id: 'welcome-email',
        name: 'Email de Boas-vindas',
        description: 'Envie um email quando um novo contato for adicionado',
        trigger: { type: 'event', config: { event: 'contact.created' } },
        actions: [{ id: '1', type: 'email', config: { template: 'welcome' } }],
    },
];

export default function AutomationsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('workflows');
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [logs, setLogs] = useState<ExecutionLog[]>([]);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

    /**
     * Automations Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchData = useCallback(async () => {
        try {
            const [workflowsData, logsData] = await Promise.all([
                apiClient.get<any>('/automations/workflows'),
                apiClient.get<any>('/automations/logs?limit=50'),
            ]);

            setWorkflows(Array.isArray(workflowsData) ? workflowsData : workflowsData.data || []);
            setLogs(Array.isArray(logsData) ? logsData : logsData.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleWorkflow = async (id: string, isEnabled: boolean) => {
        try {
            await apiClient.patch(`/automations/workflows/${id}`, { isEnabled: !isEnabled });
            fetchData();
        } catch (error) {
            console.error('Erro ao alternar workflow:', error);
        }
    };

    const handleRunWorkflow = async (id: string) => {
        try {
            await apiClient.post(`/automations/workflows/${id}/run`, {});
            fetchData();
        } catch (error) {
            console.error('Erro ao executar workflow:', error);
        }
    };

    const handleDeleteWorkflow = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta automação?')) return;

        try {
            await apiClient.delete(`/automations/workflows/${id}`);
            fetchData();
        } catch (error) {
            console.error('Erro ao excluir workflow:', error);
        }
    };

    const handleSaveWorkflow = async (data: Partial<Workflow>) => {
        try {
            if (editingWorkflow) {
                await apiClient.put(`/automations/workflows/${editingWorkflow.id}`, data);
            } else {
                await apiClient.post('/automations/workflows', data);
            }

            fetchData();
            setShowWorkflowModal(false);
            setEditingWorkflow(null);
        } catch (error) {
            console.error('Erro ao salvar workflow:', error);
        }
    };

    const handleUseTemplate = (template: typeof WORKFLOW_TEMPLATES[0]) => {
        setEditingWorkflow({
            id: '',
            name: template.name,
            description: template.description,
            trigger: template.trigger as Trigger,
            actions: template.actions as Action[],
            isEnabled: true,
            runCount: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
        });
        setShowWorkflowModal(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const stats = {
        total: workflows.length,
        active: workflows.filter(w => w.isEnabled).length,
        todayRuns: logs.filter(l => {
            const today = new Date().toDateString();
            return new Date(l.startedAt).toDateString() === today;
        }).length,
        errors: workflows.filter(w => w.status === 'error').length,
    };

    const tabs = [
        { id: 'workflows' as Tab, label: 'Automações', icon: Zap },
        { id: 'logs' as Tab, label: 'Histórico', icon: Activity },
        { id: 'templates' as Tab, label: 'Templates', icon: Copy },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Automações</h1>
                    <p>Crie e gerencie seus workflows automatizados</p>
                </div>
                <button
                    className={styles.addButton}
                    onClick={() => {
                        setEditingWorkflow(null);
                        setShowWorkflowModal(true);
                    }}
                >
                    <Plus size={20} />
                    Nova Automação
                </button>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.blue}`}>
                        <Zap size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.total}</span>
                        <span className={styles.statLabel}>Total</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.green}`}>
                        <Play size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.active}</span>
                        <span className={styles.statLabel}>Ativas</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.purple}`}>
                        <Activity size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.todayRuns}</span>
                        <span className={styles.statLabel}>Execuções Hoje</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.red}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.errors}</span>
                        <span className={styles.statLabel}>Com Erros</span>
                    </div>
                </div>
            </div>

            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'workflows' && (
                    <div className={styles.workflowsList}>
                        {workflows.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Zap size={48} />
                                <h3>Nenhuma automação criada</h3>
                                <p>Crie sua primeira automação para automatizar tarefas repetitivas</p>
                                <button
                                    className={styles.addButton}
                                    onClick={() => setShowWorkflowModal(true)}
                                >
                                    <Plus size={20} />
                                    Criar Automação
                                </button>
                            </div>
                        ) : (
                            workflows.map(workflow => {
                                const TriggerIcon = TRIGGER_TYPES.find(t => t.value === workflow.trigger.type)?.icon || Zap;
                                return (
                                    <div
                                        key={workflow.id}
                                        className={`${styles.workflowCard} ${workflow.status === 'error' ? styles.error : ''}`}
                                    >
                                        <div className={styles.workflowHeader}>
                                            <div className={styles.workflowIcon}>
                                                <TriggerIcon size={24} />
                                            </div>
                                            <div className={styles.workflowInfo}>
                                                <h3>{workflow.name}</h3>
                                                {workflow.description && (
                                                    <p>{workflow.description}</p>
                                                )}
                                            </div>
                                            <div className={styles.workflowActions}>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => handleRunWorkflow(workflow.id)}
                                                    title="Executar"
                                                >
                                                    <Play size={18} />
                                                </button>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => {
                                                        setEditingWorkflow(workflow);
                                                        setShowWorkflowModal(true);
                                                    }}
                                                    title="Editar"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.danger}`}
                                                    onClick={() => handleDeleteWorkflow(workflow.id)}
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.workflowMeta}>
                                            <span className={styles.metaItem}>
                                                <RefreshCw size={14} />
                                                {workflow.runCount} execuções
                                            </span>
                                            {workflow.lastRun && (
                                                <span className={styles.metaItem}>
                                                    <Clock size={14} />
                                                    Última: {formatDate(workflow.lastRun)}
                                                </span>
                                            )}
                                            <span className={`${styles.statusBadge} ${styles[workflow.status]}`}>
                                                {workflow.status === 'active' ? 'Ativo' :
                                                 workflow.status === 'paused' ? 'Pausado' : 'Erro'}
                                            </span>
                                        </div>

                                        <div className={styles.workflowFooter}>
                                            <div className={styles.triggerInfo}>
                                                <span>Gatilho: </span>
                                                <strong>
                                                    {TRIGGER_TYPES.find(t => t.value === workflow.trigger.type)?.label}
                                                </strong>
                                            </div>
                                            <label className={styles.toggleSwitch}>
                                                <input
                                                    type="checkbox"
                                                    checked={workflow.isEnabled}
                                                    onChange={() => handleToggleWorkflow(workflow.id, workflow.isEnabled)}
                                                />
                                                <span className={styles.slider}></span>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className={styles.logsTable}>
                        <div className={styles.tableHeader}>
                            <span>Automação</span>
                            <span>Status</span>
                            <span>Início</span>
                            <span>Duração</span>
                        </div>
                        {logs.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Activity size={48} />
                                <p>Nenhuma execução registrada</p>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className={styles.logRow}>
                                    <span className={styles.logName}>{log.workflowName}</span>
                                    <span className={`${styles.logStatus} ${styles[log.status]}`}>
                                        {log.status === 'success' && <CheckCircle size={16} />}
                                        {log.status === 'failed' && <XCircle size={16} />}
                                        {log.status === 'running' && <RefreshCw size={16} className={styles.spinning} />}
                                        {log.status === 'success' ? 'Sucesso' :
                                         log.status === 'failed' ? 'Falhou' : 'Executando'}
                                    </span>
                                    <span className={styles.logDate}>{formatDate(log.startedAt)}</span>
                                    <span className={styles.logDuration}>
                                        {log.duration ? `${log.duration}ms` : '-'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className={styles.templatesGrid}>
                        {WORKFLOW_TEMPLATES.map(template => (
                            <div key={template.id} className={styles.templateCard}>
                                <div className={styles.templateIcon}>
                                    <Zap size={28} />
                                </div>
                                <h3>{template.name}</h3>
                                <p>{template.description}</p>
                                <button
                                    className={styles.useTemplateBtn}
                                    onClick={() => handleUseTemplate(template)}
                                >
                                    Usar Template
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showWorkflowModal && (
                <WorkflowModal
                    workflow={editingWorkflow}
                    onClose={() => {
                        setShowWorkflowModal(false);
                        setEditingWorkflow(null);
                    }}
                    onSave={handleSaveWorkflow}
                />
            )}
        </div>
    );
}

function WorkflowModal({ workflow, onClose, onSave }: {
    workflow: Workflow | null;
    onClose: () => void;
    onSave: (data: Partial<Workflow>) => void;
}) {
    const [name, setName] = useState(workflow?.name || '');
    const [description, setDescription] = useState(workflow?.description || '');
    const [triggerType, setTriggerType] = useState<string>(workflow?.trigger.type || 'manual');
    const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(workflow?.trigger.config || {});
    const [actions, setActions] = useState<Action[]>(workflow?.actions || []);

    const handleAddAction = () => {
        setActions([...actions, {
            id: Date.now().toString(),
            type: 'notification',
            config: {}
        }]);
    };

    const handleRemoveAction = (id: string) => {
        setActions(actions.filter(a => a.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            description: description || undefined,
            trigger: { type: triggerType as Trigger['type'], config: triggerConfig },
            actions,
            isEnabled: true,
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{workflow ? 'Editar Automação' : 'Nova Automação'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Nome da Automação</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Lembrete Diário"
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Descrição (opcional)</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Descreva o que esta automação faz..."
                                rows={2}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Gatilho</label>
                            <div className={styles.triggerOptions}>
                                {TRIGGER_TYPES.map(trigger => {
                                    const Icon = trigger.icon;
                                    return (
                                        <button
                                            key={trigger.value}
                                            type="button"
                                            className={`${styles.triggerOption} ${triggerType === trigger.value ? styles.selected : ''}`}
                                            onClick={() => setTriggerType(trigger.value)}
                                        >
                                            <Icon size={20} />
                                            <span>{trigger.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {triggerType === 'schedule' && (
                            <div className={styles.formGroup}>
                                <label>Horário</label>
                                <input
                                    type="time"
                                    value={triggerConfig.time || '09:00'}
                                    onChange={e => setTriggerConfig({ ...triggerConfig, time: e.target.value })}
                                />
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label>Ações</label>
                            <div className={styles.actionsList}>
                                {actions.map((action, index) => {
                                    const ActionIcon = ACTION_TYPES.find(a => a.value === action.type)?.icon || Zap;
                                    return (
                                        <div key={action.id} className={styles.actionItem}>
                                            <span className={styles.actionNumber}>{index + 1}</span>
                                            <select
                                                value={action.type}
                                                onChange={e => {
                                                    const newActions = [...actions];
                                                    newActions[index].type = e.target.value as Action['type'];
                                                    setActions(newActions);
                                                }}
                                            >
                                                {ACTION_TYPES.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className={styles.removeActionBtn}
                                                onClick={() => handleRemoveAction(action.id)}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                                <button
                                    type="button"
                                    className={styles.addActionBtn}
                                    onClick={handleAddAction}
                                >
                                    <Plus size={18} />
                                    Adicionar Ação
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Zap size={18} />
                            {workflow ? 'Salvar' : 'Criar Automação'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
