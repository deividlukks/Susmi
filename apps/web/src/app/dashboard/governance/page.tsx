'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Shield, Activity, RefreshCw, Search, Filter, Download,
    Clock, User, CheckCircle, XCircle, AlertTriangle,
    ChevronLeft, ChevronRight, Eye, FileText
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';

interface AuditLog {
    id: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details: Record<string, any>;
    status: 'SUCCESS' | 'FAILED';
    duration?: number;
    ipAddress?: string;
    createdAt: string;
}

interface AuditStats {
    totalLogs: number;
    byAction: Record<string, number>;
    byResource: Record<string, number>;
    byStatus: Record<string, number>;
}

type FilterType = 'all' | 'success' | 'failed';

const ACTION_LABELS: Record<string, string> = {
    CREATE: 'Criar',
    READ: 'Ler',
    UPDATE: 'Atualizar',
    DELETE: 'Excluir',
    EXECUTE: 'Executar',
    LOGIN: 'Login',
    LOGOUT: 'Logout',
};

const RESOURCE_LABELS: Record<string, string> = {
    agents: 'Agentes',
    tasks: 'Tarefas',
    automations: 'Automações',
    users: 'Usuários',
    conversations: 'Conversas',
    calendar: 'Calendário',
    finance: 'Finanças',
    auth: 'Autenticação',
};

export default function GovernancePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const limit = 20;

    /**
     * Governance Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(page * limit),
            });

            if (filter !== 'all') {
                params.append('status', filter.toUpperCase());
            }

            const [logsData, statsData] = await Promise.all([
                apiClient.get<any>(`/audit/logs?${params}`),
                apiClient.get<any>('/audit/stats'),
            ]);

            setLogs(logsData.data || []);
            setTotal(logsData.total || 0);
            setStats(statsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = () => {
        const csv = [
            ['ID', 'Ação', 'Recurso', 'Status', 'Usuário', 'Data'].join(','),
            ...logs.map(log => [
                log.id,
                log.action,
                log.resource,
                log.status,
                log.userId || '-',
                new Date(log.createdAt).toLocaleString('pt-BR'),
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return (
            log.action.toLowerCase().includes(search) ||
            log.resource.toLowerCase().includes(search) ||
            log.resourceId?.toLowerCase().includes(search)
        );
    });

    const totalPages = Math.ceil(total / limit);

    if (loading) {
        return (
            <div className={styles.loading}>
                <RefreshCw className={styles.spinning} size={32} />
                <p>Carregando logs de auditoria...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1><Shield size={28} /> Governança & Auditoria</h1>
                    <p>Monitore todas as ações e atividades do sistema</p>
                </div>
                <button className={styles.exportButton} onClick={handleExport}>
                    <Download size={18} />
                    Exportar CSV
                </button>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.blue}`}>
                        <Activity size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats?.totalLogs || 0}</span>
                        <span className={styles.statLabel}>Total de Logs</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.green}`}>
                        <CheckCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats?.byStatus?.SUCCESS || 0}</span>
                        <span className={styles.statLabel}>Sucesso</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.red}`}>
                        <XCircle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats?.byStatus?.FAILED || 0}</span>
                        <span className={styles.statLabel}>Falhas</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.purple}`}>
                        <FileText size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {Object.keys(stats?.byResource || {}).length}
                        </span>
                        <span className={styles.statLabel}>Recursos</span>
                    </div>
                </div>
            </div>

            <div className={styles.actionsBar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por ação, recurso..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.filters}>
                    {(['all', 'success', 'failed'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                            onClick={() => { setFilter(f); setPage(0); }}
                        >
                            {f === 'all' ? 'Todos' : f === 'success' ? 'Sucesso' : 'Falhas'}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.logsTable}>
                <div className={styles.tableHeader}>
                    <span>Ação</span>
                    <span>Recurso</span>
                    <span>Status</span>
                    <span>Data</span>
                    <span>Duração</span>
                    <span></span>
                </div>
                {filteredLogs.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Shield size={48} />
                        <p>Nenhum log encontrado</p>
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className={styles.logRow}>
                            <span className={styles.action}>
                                <span className={`${styles.actionBadge} ${styles[log.action.toLowerCase()]}`}>
                                    {ACTION_LABELS[log.action] || log.action}
                                </span>
                            </span>
                            <span className={styles.resource}>
                                {RESOURCE_LABELS[log.resource] || log.resource}
                                {log.resourceId && (
                                    <small className={styles.resourceId}>#{log.resourceId.slice(0, 8)}</small>
                                )}
                            </span>
                            <span className={`${styles.status} ${styles[log.status.toLowerCase()]}`}>
                                {log.status === 'SUCCESS' ? (
                                    <><CheckCircle size={14} /> Sucesso</>
                                ) : (
                                    <><XCircle size={14} /> Falha</>
                                )}
                            </span>
                            <span className={styles.date}>
                                <Clock size={14} />
                                {formatDate(log.createdAt)}
                            </span>
                            <span className={styles.duration}>
                                {log.duration ? `${log.duration}ms` : '-'}
                            </span>
                            <span>
                                <button
                                    className={styles.viewBtn}
                                    onClick={() => setSelectedLog(log)}
                                    title="Ver detalhes"
                                >
                                    <Eye size={16} />
                                </button>
                            </span>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span>
                        Página {page + 1} de {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {selectedLog && (
                <LogDetailModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
}

function LogDetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Detalhes do Log</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.detailRow}>
                        <label>ID</label>
                        <span>{log.id}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>Ação</label>
                        <span className={`${styles.actionBadge} ${styles[log.action.toLowerCase()]}`}>
                            {ACTION_LABELS[log.action] || log.action}
                        </span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>Recurso</label>
                        <span>{RESOURCE_LABELS[log.resource] || log.resource}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>ID do Recurso</label>
                        <span>{log.resourceId || '-'}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>Status</label>
                        <span className={`${styles.status} ${styles[log.status.toLowerCase()]}`}>
                            {log.status}
                        </span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>Usuário</label>
                        <span>{log.userId || 'Sistema'}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>IP</label>
                        <span>{log.ipAddress || '-'}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>Duração</label>
                        <span>{log.duration ? `${log.duration}ms` : '-'}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <label>Data</label>
                        <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    {Object.keys(log.details || {}).length > 0 && (
                        <div className={styles.detailRow}>
                            <label>Detalhes</label>
                            <pre className={styles.jsonBlock}>
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
