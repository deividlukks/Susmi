'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users, Play, Plus, X, Settings, Edit, Trash2,
    Activity, CheckCircle, RefreshCw, Bot, Shield,
    Briefcase, Code, TrendingUp, Eye, Zap, Brain,
    Copy, Wrench, MessageSquare, Search, MoreVertical,
    ChevronDown, ChevronRight, ExternalLink, Loader2
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';

interface Agent {
    id: string;
    name: string;
    description?: string;
    type: string;
    isActive: boolean;
    isSystem?: boolean;
    model?: string;
    temperature?: number;
    tools: string[];
    systemPrompt?: string;
    createdAt: string;
    updatedAt: string;
    config?: Record<string, any>;
}

interface AgentStats {
    totalAgents: number;
    activeAgents: number;
    byType: Record<string, number>;
    totalExecutions: number;
}

interface AvailableTool {
    name: string;
    description: string;
    type: string;
    parameters: any[];
}

type Tab = 'all' | 'system' | 'custom';

const AGENT_TYPES = [
    { value: 'CONVERSATIONAL', label: 'Conversacional', icon: Bot },
    { value: 'TASK_EXECUTOR', label: 'Executor de Tarefas', icon: CheckCircle },
    { value: 'RESEARCHER', label: 'Pesquisador', icon: Eye },
    { value: 'SCHEDULER', label: 'Agendador', icon: Activity },
    { value: 'FINANCIAL', label: 'Financeiro', icon: TrendingUp },
    { value: 'HOME_AUTOMATION', label: 'Casa Inteligente', icon: Zap },
    { value: 'HEALTH', label: 'Saúde', icon: Activity },
    { value: 'SECURITY', label: 'Segurança', icon: Shield },
    { value: 'OPERATIONAL', label: 'Operacional', icon: Briefcase },
    { value: 'DEVOPS', label: 'DevOps', icon: Code },
    { value: 'MONITORING', label: 'Monitoramento', icon: Activity },
    { value: 'CUSTOM', label: 'Personalizado', icon: Settings },
];

export default function AgentsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [loading, setLoading] = useState(true);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [stats, setStats] = useState<AgentStats | null>(null);
    const [availableTools, setAvailableTools] = useState<AvailableTool[]>([]);

    // Modals
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [showToolsModal, setShowToolsModal] = useState(false);
    const [showExecuteModal, setShowExecuteModal] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);

    // State
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [executeResult, setExecuteResult] = useState<any>(null);
    const [executing, setExecuting] = useState(false);

    /**
     * Agents Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchData = useCallback(async () => {
        try {
            const [agentsData, statsData, toolsData] = await Promise.all([
                apiClient.get<any>('/agents?activeOnly=false'),
                apiClient.get<any>('/agents/stats'),
                apiClient.get<any>('/agents/tools/available'),
            ]);

            setAgents(Array.isArray(agentsData) ? agentsData : agentsData.data || []);
            setStats(statsData);
            setAvailableTools(Array.isArray(toolsData) ? toolsData : []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ==========================================
    // CRUD Operations
    // ==========================================

    const handleCreateAgent = async (data: Partial<Agent>) => {
        try {
            await apiClient.post('/agents', data);
            fetchData();
            setShowAgentModal(false);
        } catch (error) {
            console.error('Erro ao criar agente:', error);
        }
    };

    const handleUpdateAgent = async (id: string, data: Partial<Agent>) => {
        try {
            await apiClient.patch(`/agents/${id}`, data);
            fetchData();
            setShowAgentModal(false);
            setEditingAgent(null);
        } catch (error) {
            console.error('Erro ao atualizar agente:', error);
        }
    };

    const handleDeleteAgent = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agente?')) return;

        try {
            await apiClient.delete(`/agents/${id}`);
            fetchData();
        } catch (error) {
            console.error('Erro ao excluir agente:', error);
        }
    };

    const handleDuplicateAgent = async (id: string) => {
        const agent = agents.find(a => a.id === id);
        if (!agent) return;

        const newName = prompt('Nome do novo agente:', `${agent.name} (cópia)`);
        if (!newName) return;

        try {
            await apiClient.post(`/agents/${id}/duplicate`, { name: newName });
            fetchData();
        } catch (error) {
            console.error('Erro ao duplicar agente:', error);
        }
    };

    const handleToggleAgent = async (id: string, currentState: boolean) => {
        try {
            await apiClient.patch(`/agents/${id}`, { isActive: !currentState });
            fetchData();
        } catch (error) {
            console.error('Erro ao alternar agente:', error);
        }
    };

    // ==========================================
    // Tools Management
    // ==========================================

    const handleAddTool = async (agentId: string, toolName: string) => {
        try {
            await apiClient.post(`/agents/${agentId}/tools`, { toolName });
            fetchData();
        } catch (error) {
            console.error('Erro ao adicionar ferramenta:', error);
        }
    };

    const handleRemoveTool = async (agentId: string, toolName: string) => {
        try {
            await apiClient.delete(`/agents/${agentId}/tools/${toolName}`);
            fetchData();
        } catch (error) {
            console.error('Erro ao remover ferramenta:', error);
        }
    };

    // ==========================================
    // Execution
    // ==========================================

    const handleExecuteAgent = async (agentId: string, input: string) => {
        setExecuting(true);
        setExecuteResult(null);

        try {
            const data = await apiClient.post<any>(`/agents/${agentId}/execute`, { input });
            setExecuteResult(data);
        } catch (error) {
            console.error('Erro ao executar agente:', error);
            setExecuteResult({ error: 'Falha na execução' });
        } finally {
            setExecuting(false);
        }
    };

    // ==========================================
    // Quick Actions
    // ==========================================

    const handleQuickChat = async (message: string) => {
        setExecuting(true);
        try {
            const data = await apiClient.post<any>('/agents/chat', { message });
            setExecuteResult(data);
        } catch (error) {
            console.error('Erro no chat:', error);
        } finally {
            setExecuting(false);
        }
    };

    const handleQuickTask = async (task: string) => {
        setExecuting(true);
        try {
            const data = await apiClient.post<any>('/agents/task', { task });
            setExecuteResult(data);
        } catch (error) {
            console.error('Erro na tarefa:', error);
        } finally {
            setExecuting(false);
        }
    };

    const handleQuickResearch = async (query: string) => {
        setExecuting(true);
        try {
            const data = await apiClient.post<any>('/agents/research', { query });
            setExecuteResult(data);
        } catch (error) {
            console.error('Erro na pesquisa:', error);
        } finally {
            setExecuting(false);
        }
    };

    // ==========================================
    // Helpers
    // ==========================================

    const getAgentIcon = (type: string) => {
        const agentType = AGENT_TYPES.find(t => t.value === type);
        return agentType?.icon || Bot;
    };

    const filteredAgents = agents.filter(agent => {
        if (activeTab === 'system') return agent.isSystem || agent.config?.isSystem;
        if (activeTab === 'custom') return !agent.isSystem && !agent.config?.isSystem;
        return true;
    });

    const tabs = [
        { id: 'all' as Tab, label: 'Todos', count: agents.length },
        { id: 'system' as Tab, label: 'Sistema', count: agents.filter(a => a.isSystem || a.config?.isSystem).length },
        { id: 'custom' as Tab, label: 'Personalizados', count: agents.filter(a => !a.isSystem && !a.config?.isSystem).length },
    ];

    if (loading) {
        return (
            <div className={styles.loading}>
                <RefreshCw className={styles.spinning} size={32} />
                <p>Carregando agentes...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1><Brain size={28} /> Agentes IA</h1>
                    <p>Gerencie seus agentes inteligentes especializados</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.quickActionsBtn}
                        onClick={() => setShowQuickActions(true)}
                    >
                        <Zap size={18} />
                        Ações Rápidas
                    </button>
                    <button
                        className={styles.addButton}
                        onClick={() => {
                            setEditingAgent(null);
                            setShowAgentModal(true);
                        }}
                    >
                        <Plus size={20} />
                        Novo Agente
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.blue}`}>
                        <Users size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats?.totalAgents || agents.length}</span>
                        <span className={styles.statLabel}>Total</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.green}`}>
                        <Play size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats?.activeAgents || agents.filter(a => a.isActive).length}</span>
                        <span className={styles.statLabel}>Ativos</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.purple}`}>
                        <Activity size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats?.totalExecutions || 0}</span>
                        <span className={styles.statLabel}>Execuções</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.orange}`}>
                        <Wrench size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{availableTools.length}</span>
                        <span className={styles.statLabel}>Ferramentas</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        <span className={styles.tabCount}>{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Agents Grid */}
            <div className={styles.agentsGrid}>
                {filteredAgents.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Bot size={48} />
                        <h3>Nenhum agente encontrado</h3>
                        <p>Crie seu primeiro agente personalizado</p>
                    </div>
                ) : (
                    filteredAgents.map(agent => {
                        const AgentIcon = getAgentIcon(agent.type);
                        const typeInfo = AGENT_TYPES.find(t => t.value === agent.type);
                        const isSystem = agent.isSystem || agent.config?.isSystem;

                        return (
                            <div
                                key={agent.id}
                                className={`${styles.agentCard} ${!agent.isActive ? styles.inactive : ''}`}
                            >
                                <div className={styles.agentHeader}>
                                    <div className={styles.agentIcon}>
                                        <AgentIcon size={24} />
                                    </div>
                                    <div className={styles.agentInfo}>
                                        <h3>{agent.name}</h3>
                                        <span className={styles.agentType}>
                                            {typeInfo?.label || agent.type}
                                        </span>
                                    </div>
                                    {isSystem && (
                                        <span className={styles.systemBadge}>Sistema</span>
                                    )}
                                </div>

                                {agent.description && (
                                    <p className={styles.agentDescription}>{agent.description}</p>
                                )}

                                <div className={styles.agentMeta}>
                                    <span className={styles.metaItem}>
                                        <Brain size={14} />
                                        {agent.model || 'GPT-4'}
                                    </span>
                                    <span
                                        className={`${styles.metaItem} ${styles.clickable}`}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setShowToolsModal(true);
                                        }}
                                    >
                                        <Wrench size={14} />
                                        {agent.tools?.length || 0} tools
                                    </span>
                                </div>

                                <div className={styles.agentActions}>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setShowExecuteModal(true);
                                        }}
                                        title="Executar"
                                    >
                                        <Play size={16} />
                                    </button>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => {
                                            setSelectedAgent(agent);
                                            setShowToolsModal(true);
                                        }}
                                        title="Ferramentas"
                                    >
                                        <Wrench size={16} />
                                    </button>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => handleDuplicateAgent(agent.id)}
                                        title="Duplicar"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    {!isSystem && (
                                        <>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => {
                                                    setEditingAgent(agent);
                                                    setShowAgentModal(true);
                                                }}
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className={`${styles.actionBtn} ${styles.danger}`}
                                                onClick={() => handleDeleteAgent(agent.id)}
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                    <label className={styles.toggleSwitch}>
                                        <input
                                            type="checkbox"
                                            checked={agent.isActive}
                                            onChange={() => handleToggleAgent(agent.id, agent.isActive)}
                                        />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            {showAgentModal && (
                <AgentModal
                    agent={editingAgent}
                    availableTools={availableTools}
                    onClose={() => {
                        setShowAgentModal(false);
                        setEditingAgent(null);
                    }}
                    onSave={(data) => {
                        if (editingAgent) {
                            handleUpdateAgent(editingAgent.id, data);
                        } else {
                            handleCreateAgent(data);
                        }
                    }}
                />
            )}

            {showToolsModal && selectedAgent && (
                <ToolsModal
                    agent={selectedAgent}
                    availableTools={availableTools}
                    onClose={() => {
                        setShowToolsModal(false);
                        setSelectedAgent(null);
                    }}
                    onAddTool={(toolName) => handleAddTool(selectedAgent.id, toolName)}
                    onRemoveTool={(toolName) => handleRemoveTool(selectedAgent.id, toolName)}
                />
            )}

            {showExecuteModal && selectedAgent && (
                <ExecuteModal
                    agent={selectedAgent}
                    executing={executing}
                    result={executeResult}
                    onClose={() => {
                        setShowExecuteModal(false);
                        setSelectedAgent(null);
                        setExecuteResult(null);
                    }}
                    onExecute={(input) => handleExecuteAgent(selectedAgent.id, input)}
                />
            )}

            {showQuickActions && (
                <QuickActionsModal
                    executing={executing}
                    result={executeResult}
                    onClose={() => {
                        setShowQuickActions(false);
                        setExecuteResult(null);
                    }}
                    onChat={handleQuickChat}
                    onTask={handleQuickTask}
                    onResearch={handleQuickResearch}
                />
            )}
        </div>
    );
}

// ==========================================
// Agent Modal (Create/Edit)
// ==========================================

function AgentModal({ agent, availableTools, onClose, onSave }: {
    agent: Agent | null;
    availableTools: AvailableTool[];
    onClose: () => void;
    onSave: (data: Partial<Agent>) => void;
}) {
    const [name, setName] = useState(agent?.name || '');
    const [description, setDescription] = useState(agent?.description || '');
    const [type, setType] = useState(agent?.type || 'CONVERSATIONAL');
    const [temperature, setTemperature] = useState(agent?.temperature || 0.7);
    const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt || '');
    const [selectedTools, setSelectedTools] = useState<string[]>(agent?.tools || []);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            description: description || undefined,
            type,
            temperature,
            systemPrompt: systemPrompt || undefined,
            tools: selectedTools,
        });
    };

    const toggleTool = (toolName: string) => {
        setSelectedTools(prev =>
            prev.includes(toolName)
                ? prev.filter(t => t !== toolName)
                : [...prev, toolName]
        );
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{agent ? 'Editar Agente' : 'Novo Agente'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Nome do Agente *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Assistente de Vendas"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Tipo do Agente</label>
                                <select value={type} onChange={e => setType(e.target.value)}>
                                    {AGENT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Descrição</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Descreva o que este agente faz..."
                                rows={2}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Ferramentas Disponíveis</label>
                            <div className={styles.toolsGrid}>
                                {availableTools.map(tool => (
                                    <label
                                        key={tool.name}
                                        className={`${styles.toolCheckbox} ${selectedTools.includes(tool.name) ? styles.selected : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTools.includes(tool.name)}
                                            onChange={() => toggleTool(tool.name)}
                                        />
                                        <Wrench size={14} />
                                        <span>{tool.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            className={styles.advancedToggle}
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            Opções Avançadas
                        </button>

                        {showAdvanced && (
                            <>
                                <div className={styles.formGroup}>
                                    <label>Temperatura ({temperature})</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={temperature}
                                        onChange={e => setTemperature(parseFloat(e.target.value))}
                                    />
                                    <small>Menor = mais focado, Maior = mais criativo</small>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>System Prompt (Personalizar comportamento)</label>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={e => setSystemPrompt(e.target.value)}
                                        placeholder="Você é um assistente especializado em..."
                                        rows={4}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Bot size={18} />
                            {agent ? 'Salvar Alterações' : 'Criar Agente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// Tools Modal
// ==========================================

function ToolsModal({ agent, availableTools, onClose, onAddTool, onRemoveTool }: {
    agent: Agent;
    availableTools: AvailableTool[];
    onClose: () => void;
    onAddTool: (toolName: string) => void;
    onRemoveTool: (toolName: string) => void;
}) {
    const agentTools = agent.tools || [];
    const unusedTools = availableTools.filter(t => !agentTools.includes(t.name));

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>
                        <Wrench size={20} />
                        Ferramentas: {agent.name}
                    </h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.toolsSection}>
                        <h3>Ferramentas Ativas ({agentTools.length})</h3>
                        {agentTools.length === 0 ? (
                            <p className={styles.emptyText}>Nenhuma ferramenta configurada</p>
                        ) : (
                            <div className={styles.toolsList}>
                                {agentTools.map(toolName => {
                                    const tool = availableTools.find(t => t.name === toolName);
                                    return (
                                        <div key={toolName} className={styles.toolItem}>
                                            <div className={styles.toolInfo}>
                                                <strong>{toolName}</strong>
                                                <small>{tool?.description || 'Sem descrição'}</small>
                                            </div>
                                            <button
                                                className={styles.removeToolBtn}
                                                onClick={() => onRemoveTool(toolName)}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className={styles.toolsSection}>
                        <h3>Adicionar Ferramentas ({unusedTools.length})</h3>
                        <div className={styles.toolsList}>
                            {unusedTools.map(tool => (
                                <div key={tool.name} className={styles.toolItem}>
                                    <div className={styles.toolInfo}>
                                        <strong>{tool.name}</strong>
                                        <small>{tool.description}</small>
                                    </div>
                                    <button
                                        className={styles.addToolBtn}
                                        onClick={() => onAddTool(tool.name)}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// Execute Modal
// ==========================================

function ExecuteModal({ agent, executing, result, onClose, onExecute }: {
    agent: Agent;
    executing: boolean;
    result: any;
    onClose: () => void;
    onExecute: (input: string) => void;
}) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onExecute(input);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>
                        <Play size={20} />
                        Executar: {agent.name}
                    </h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Comando / Entrada</label>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Digite o comando ou pergunta para o agente..."
                                rows={3}
                                required
                            />
                        </div>

                        {result && (
                            <div className={styles.resultSection}>
                                <h3>Resultado</h3>
                                <pre className={styles.resultBlock}>
                                    {typeof result === 'string'
                                        ? result
                                        : JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Fechar
                        </button>
                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={executing}
                        >
                            {executing ? (
                                <><Loader2 size={18} className={styles.spinning} /> Executando...</>
                            ) : (
                                <><Play size={18} /> Executar</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ==========================================
// Quick Actions Modal
// ==========================================

function QuickActionsModal({ executing, result, onClose, onChat, onTask, onResearch }: {
    executing: boolean;
    result: any;
    onClose: () => void;
    onChat: (message: string) => void;
    onTask: (task: string) => void;
    onResearch: (query: string) => void;
}) {
    const [activeAction, setActiveAction] = useState<'chat' | 'task' | 'research'>('chat');
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        switch (activeAction) {
            case 'chat':
                onChat(input);
                break;
            case 'task':
                onTask(input);
                break;
            case 'research':
                onResearch(input);
                break;
        }
    };

    const actions = [
        { id: 'chat' as const, label: 'Chat', icon: MessageSquare, placeholder: 'Converse com a Susmi...' },
        { id: 'task' as const, label: 'Tarefa', icon: CheckCircle, placeholder: 'Crie uma tarefa...' },
        { id: 'research' as const, label: 'Pesquisa', icon: Search, placeholder: 'Pesquise algo...' },
    ];

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalLarge} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2><Zap size={20} /> Ações Rápidas</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.quickActionTabs}>
                        {actions.map(action => {
                            const Icon = action.icon;
                            return (
                                <button
                                    key={action.id}
                                    type="button"
                                    className={`${styles.quickActionTab} ${activeAction === action.id ? styles.active : ''}`}
                                    onClick={() => setActiveAction(action.id)}
                                >
                                    <Icon size={18} />
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={actions.find(a => a.id === activeAction)?.placeholder}
                                rows={3}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={executing}
                            style={{ width: '100%' }}
                        >
                            {executing ? (
                                <><Loader2 size={18} className={styles.spinning} /> Processando...</>
                            ) : (
                                <><Zap size={18} /> Enviar</>
                            )}
                        </button>
                    </form>

                    {result && (
                        <div className={styles.resultSection}>
                            <h3>Resposta</h3>
                            <pre className={styles.resultBlock}>
                                {typeof result === 'string'
                                    ? result
                                    : result.response || result.output || JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
