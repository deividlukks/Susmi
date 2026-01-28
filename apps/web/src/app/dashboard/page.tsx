'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { CheckSquare, MessageSquare, Zap, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Stats {
    pendingTasks: number;
    conversations: number;
    activeAutomations: number;
    savedTime: number;
}

/**
 * Dashboard Page - Refatorado com DRY
 *
 * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
 */
export default function DashboardPage() {
    const router = useRouter();
    const [userName, setUserName] = useState('Usuário');
    const [stats, setStats] = useState<Stats>({
        pendingTasks: 0,
        conversations: 0,
        activeAutomations: 0,
        savedTime: 0,
    });
    const [loading, setLoading] = useState(true);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const fetchStats = useCallback(async () => {
        try {
            // ANTES: getHeaders duplicado + fetch manual
            // DEPOIS: apiClient.get() - DRY!
            const [tasksData, conversationsData] = await Promise.all([
                apiClient.get<any>('/tasks/stats'),
                apiClient.get<any>('/conversations')
            ]);

            const newStats: Stats = {
                pendingTasks: (tasksData.pending || 0) + (tasksData.inProgress || 0),
                conversations: Array.isArray(conversationsData)
                    ? conversationsData.length
                    : conversationsData.data?.length || 0,
                activeAutomations: 0, // Futuro
                savedTime: 0, // Futuro
            };

            setStats(newStats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            // apiClient já redireciona para /login se 401
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserName(user.name || 'Usuário');
            } catch { }
        }

        fetchStats();
    }, [fetchStats]);

    const greeting = getGreeting();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    {greeting}, <span className={styles.userName}>{userName}</span>!
                </h1>
                <p className={styles.subtitle}>
                    Como posso ajudar você hoje?
                </p>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <CheckSquare />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {loading ? '-' : stats.pendingTasks}
                        </span>
                        <span className={styles.statLabel}>Tarefas pendentes</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <MessageSquare />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {loading ? '-' : stats.conversations}
                        </span>
                        <span className={styles.statLabel}>Conversas</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <Zap />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {stats.activeAutomations}
                        </span>
                        <span className={styles.statLabel}>Automações ativas</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <Clock />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {stats.savedTime}h
                        </span>
                        <span className={styles.statLabel}>Tempo economizado</span>
                    </div>
                </div>
            </div>

            <section className={styles.quickActions}>
                <h2>Ações Rápidas</h2>
                <div className={styles.actionsGrid}>
                    <a href="/dashboard/chat" className={styles.actionCard}>
                        <MessageSquare className={styles.actionIcon} />
                        <span>Iniciar Conversa</span>
                    </a>
                    <a href="/dashboard/tasks" className={styles.actionCard}>
                        <CheckSquare className={styles.actionIcon} />
                        <span>Nova Tarefa</span>
                    </a>
                </div>
            </section>
        </div>
    );
}
