'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Wallet, TrendingUp, TrendingDown, PiggyBank,
    CreditCard, ArrowUpRight, ArrowDownRight, MoreVertical,
    Edit2, Trash2, Target, PieChart, DollarSign, X, Save
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '@/lib/formatters';
import { TransactionType } from '@susmi/shared/enums';

interface Account {
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    institution?: string;
    color?: string;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    date: string;
    categoryId?: string;
    category?: { name: string; icon: string; color: string };
    accountId: string;
    account?: { name: string };
}

interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
}

interface Budget {
    id: string;
    categoryId: string;
    category?: Category;
    amount: number;
    spent: number;
    period: string;
}

interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    icon?: string;
    color?: string;
}

type TabType = 'overview' | 'transactions' | 'accounts' | 'budgets' | 'goals';

export default function FinancePage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [summary, setSummary] = useState({
        totalBalance: 0,
        monthIncome: 0,
        monthExpenses: 0,
        monthSavings: 0
    });

    // Modal states
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    /**
     * Finance Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO:
     * - Usa apiClient em vez de getHeaders duplicado
     * - Usa formatters compartilhados
     * - Usa enums de @susmi/shared
     */
    const fetchData = useCallback(async () => {
        try {
            // apiClient já gerencia autenticação e redireciona se 401
            const [accountsData, transactionsData, categoriesData, budgetsData, goalsData, summaryData] = await Promise.all([
                apiClient.get<any>('/finance/accounts'),
                apiClient.get<any>('/finance/transactions?limit=50'),
                apiClient.get<any>('/finance/categories'),
                apiClient.get<any>('/finance/budgets'),
                apiClient.get<any>('/finance/goals'),
                apiClient.get<any>('/finance/summary')
            ]);

            setAccounts(Array.isArray(accountsData) ? accountsData : accountsData.data || []);
            setTransactions(Array.isArray(transactionsData) ? transactionsData : transactionsData.data || []);
            setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData.data || []);
            setBudgets(Array.isArray(budgetsData) ? budgetsData : budgetsData.data || []);
            setGoals(Array.isArray(goalsData) ? goalsData : goalsData.data || []);

            setSummary({
                totalBalance: summaryData.totalBalance || 0,
                monthIncome: summaryData.monthIncome || summaryData.income || 0,
                monthExpenses: summaryData.monthExpenses || summaryData.expenses || 0,
                monthSavings: summaryData.monthSavings || (summaryData.income - summaryData.expenses) || 0
            });
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Account operations
    const handleSaveAccount = async (accountData: Partial<Account>) => {
        try {
            if (editingItem) {
                await apiClient.put(`/finance/accounts/${editingItem.id}`, accountData);
            } else {
                await apiClient.post('/finance/accounts', accountData);
            }
            fetchData();
            setShowAccountModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

        try {
            await apiClient.delete(`/finance/accounts/${id}`);
            fetchData();
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
        }
    };

    // Transaction operations
    const handleSaveTransaction = async (transactionData: Partial<Transaction>) => {
        try {
            if (editingItem) {
                await apiClient.put(`/finance/transactions/${editingItem.id}`, transactionData);
            } else {
                await apiClient.post('/finance/transactions', transactionData);
            }
            fetchData();
            setShowTransactionModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        try {
            await apiClient.delete(`/finance/transactions/${id}`);
            fetchData();
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
        }
    };

    // Goal operations
    const handleSaveGoal = async (goalData: Partial<Goal>) => {
        try {
            if (editingItem) {
                await apiClient.put(`/finance/goals/${editingItem.id}`, goalData);
            } else {
                await apiClient.post('/finance/goals', goalData);
            }
            fetchData();
            setShowGoalModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Erro ao salvar meta:', error);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando dados financeiros...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Finanças</h1>
                    <p>Gerencie suas contas, transações e metas</p>
                </div>
                <button
                    className={styles.addButton}
                    onClick={() => {
                        setEditingItem(null);
                        setShowTransactionModal(true);
                    }}
                >
                    <Plus size={20} />
                    Nova Transação
                </button>
            </header>

            {/* Summary Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.primary}`}>
                        <Wallet size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{formatCurrencyUtil(summary.totalBalance)}</span>
                        <span className={styles.statLabel}>Saldo Total</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.success}`}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{formatCurrencyUtil(summary.monthIncome)}</span>
                        <span className={styles.statLabel}>Receitas do Mês</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.danger}`}>
                        <TrendingDown size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{formatCurrencyUtil(summary.monthExpenses)}</span>
                        <span className={styles.statLabel}>Despesas do Mês</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.info}`}>
                        <PiggyBank size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{formatCurrencyUtil(summary.monthSavings)}</span>
                        <span className={styles.statLabel}>Economia do Mês</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {[
                    { id: 'overview', label: 'Visão Geral', icon: PieChart },
                    { id: 'transactions', label: 'Transações', icon: ArrowUpRight },
                    { id: 'accounts', label: 'Contas', icon: CreditCard },
                    { id: 'budgets', label: 'Orçamentos', icon: Target },
                    { id: 'goals', label: 'Metas', icon: PiggyBank },
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
                        {/* Recent Transactions */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Transações Recentes</h2>
                                <button onClick={() => setActiveTab('transactions')}>Ver todas</button>
                            </div>
                            <div className={styles.transactionsList}>
                                {transactions.slice(0, 5).map(transaction => (
                                    <div key={transaction.id} className={styles.transactionItem}>
                                        <div className={styles.transactionIcon} style={{
                                            backgroundColor: transaction.category?.color || '#6b7280'
                                        }}>
                                            {transaction.type === TransactionType.INCOME ?
                                                <ArrowDownRight size={18} /> :
                                                <ArrowUpRight size={18} />
                                            }
                                        </div>
                                        <div className={styles.transactionInfo}>
                                            <span className={styles.transactionDesc}>{transaction.description}</span>
                                            <span className={styles.transactionMeta}>
                                                {transaction.category?.name || 'Sem categoria'} • {formatDateUtil(transaction.date)}
                                            </span>
                                        </div>
                                        <span className={`${styles.transactionAmount} ${transaction.type === TransactionType.INCOME ? styles.income : styles.expense
                                            }`}>
                                            {transaction.type === TransactionType.INCOME ? '+' : '-'}
                                            {formatCurrencyUtil(Math.abs(transaction.amount))}
                                        </span>
                                    </div>
                                ))}
                                {transactions.length === 0 && (
                                    <p className={styles.emptyText}>Nenhuma transação registrada</p>
                                )}
                            </div>
                        </div>

                        {/* Accounts Summary */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Minhas Contas</h2>
                                <button onClick={() => {
                                    setEditingItem(null);
                                    setShowAccountModal(true);
                                }}>
                                    <Plus size={16} /> Adicionar
                                </button>
                            </div>
                            <div className={styles.accountsList}>
                                {accounts.map(account => (
                                    <div key={account.id} className={styles.accountItem}>
                                        <div className={styles.accountIcon} style={{
                                            backgroundColor: account.color || '#3b82f6'
                                        }}>
                                            <CreditCard size={18} />
                                        </div>
                                        <div className={styles.accountInfo}>
                                            <span className={styles.accountName}>{account.name}</span>
                                            <span className={styles.accountType}>{account.institution || account.type}</span>
                                        </div>
                                        <span className={styles.accountBalance}>
                                            {formatCurrencyUtil(account.balance)}
                                        </span>
                                    </div>
                                ))}
                                {accounts.length === 0 && (
                                    <p className={styles.emptyText}>Nenhuma conta cadastrada</p>
                                )}
                            </div>
                        </div>

                        {/* Goals Progress */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Metas Financeiras</h2>
                                <button onClick={() => {
                                    setEditingItem(null);
                                    setShowGoalModal(true);
                                }}>
                                    <Plus size={16} /> Adicionar
                                </button>
                            </div>
                            <div className={styles.goalsList}>
                                {goals.map(goal => {
                                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                                    return (
                                        <div key={goal.id} className={styles.goalItem}>
                                            <div className={styles.goalHeader}>
                                                <span className={styles.goalName}>{goal.name}</span>
                                                <span className={styles.goalProgress}>{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className={styles.progressBar}>
                                                <div
                                                    className={styles.progressFill}
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                            </div>
                                            <div className={styles.goalAmounts}>
                                                <span>{formatCurrencyUtil(goal.currentAmount)}</span>
                                                <span>de {formatCurrencyUtil(goal.targetAmount)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {goals.length === 0 && (
                                    <p className={styles.emptyText}>Nenhuma meta cadastrada</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className={styles.transactionsTab}>
                        <div className={styles.transactionsList}>
                            {transactions.map(transaction => (
                                <div key={transaction.id} className={styles.transactionItem}>
                                    <div className={styles.transactionIcon} style={{
                                        backgroundColor: transaction.category?.color || '#6b7280'
                                    }}>
                                        {transaction.type === TransactionType.INCOME ?
                                            <ArrowDownRight size={18} /> :
                                            <ArrowUpRight size={18} />
                                        }
                                    </div>
                                    <div className={styles.transactionInfo}>
                                        <span className={styles.transactionDesc}>{transaction.description}</span>
                                        <span className={styles.transactionMeta}>
                                            {transaction.category?.name || 'Sem categoria'} •
                                            {transaction.account?.name || 'Conta'} •
                                            {formatDateUtil(transaction.date)}
                                        </span>
                                    </div>
                                    <span className={`${styles.transactionAmount} ${transaction.type === TransactionType.INCOME ? styles.income : styles.expense
                                        }`}>
                                        {transaction.type === TransactionType.INCOME ? '+' : '-'}
                                        {formatCurrencyUtil(Math.abs(transaction.amount))}
                                    </span>
                                    <div className={styles.transactionActions}>
                                        <button onClick={() => {
                                            setEditingItem(transaction);
                                            setShowTransactionModal(true);
                                        }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteTransaction(transaction.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'accounts' && (
                    <div className={styles.accountsTab}>
                        <div className={styles.accountsGrid}>
                            {accounts.map(account => (
                                <div key={account.id} className={styles.accountCard}>
                                    <div className={styles.accountCardHeader}>
                                        <div className={styles.accountIcon} style={{
                                            backgroundColor: account.color || '#3b82f6'
                                        }}>
                                            <CreditCard size={24} />
                                        </div>
                                        <div className={styles.accountCardActions}>
                                            <button onClick={() => {
                                                setEditingItem(account);
                                                setShowAccountModal(true);
                                            }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteAccount(account.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3>{account.name}</h3>
                                    <p>{account.institution || account.type}</p>
                                    <span className={styles.accountCardBalance}>
                                        {formatCurrencyUtil(account.balance)}
                                    </span>
                                </div>
                            ))}
                            <button
                                className={styles.addAccountCard}
                                onClick={() => {
                                    setEditingItem(null);
                                    setShowAccountModal(true);
                                }}
                            >
                                <Plus size={32} />
                                <span>Adicionar Conta</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'budgets' && (
                    <div className={styles.budgetsTab}>
                        <div className={styles.budgetsList}>
                            {budgets.map(budget => {
                                const percentage = (budget.spent / budget.amount) * 100;
                                const isOverBudget = percentage > 100;
                                return (
                                    <div key={budget.id} className={styles.budgetItem}>
                                        <div className={styles.budgetHeader}>
                                            <div className={styles.budgetCategory}>
                                                <div
                                                    className={styles.budgetIcon}
                                                    style={{ backgroundColor: budget.category?.color || '#6b7280' }}
                                                />
                                                <span>{budget.category?.name || 'Categoria'}</span>
                                            </div>
                                            <span className={`${styles.budgetStatus} ${isOverBudget ? styles.over : ''}`}>
                                                {formatCurrencyUtil(budget.spent)} / {formatCurrencyUtil(budget.amount)}
                                            </span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={`${styles.progressFill} ${isOverBudget ? styles.over : ''}`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                        <span className={styles.budgetRemaining}>
                                            {isOverBudget ?
                                                `Excedido em ${formatCurrencyUtil(budget.spent - budget.amount)}` :
                                                `Restam ${formatCurrencyUtil(budget.amount - budget.spent)}`
                                            }
                                        </span>
                                    </div>
                                );
                            })}
                            {budgets.length === 0 && (
                                <div className={styles.emptyState}>
                                    <Target size={48} />
                                    <h3>Nenhum orçamento definido</h3>
                                    <p>Crie orçamentos para controlar seus gastos por categoria</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'goals' && (
                    <div className={styles.goalsTab}>
                        <div className={styles.goalsGrid}>
                            {goals.map(goal => {
                                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                                return (
                                    <div key={goal.id} className={styles.goalCard}>
                                        <div className={styles.goalCardHeader}>
                                            <PiggyBank size={24} />
                                            <div className={styles.goalCardActions}>
                                                <button onClick={() => {
                                                    setEditingItem(goal);
                                                    setShowGoalModal(true);
                                                }}>
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3>{goal.name}</h3>
                                        <div className={styles.goalProgress}>
                                            <div className={styles.progressBar}>
                                                <div
                                                    className={styles.progressFill}
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                            </div>
                                            <span>{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className={styles.goalAmounts}>
                                            <span>{formatCurrencyUtil(goal.currentAmount)}</span>
                                            <span>Meta: {formatCurrencyUtil(goal.targetAmount)}</span>
                                        </div>
                                        {goal.deadline && (
                                            <p className={styles.goalDeadline}>
                                                Prazo: {formatDateUtil(goal.deadline)}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                            <button
                                className={styles.addGoalCard}
                                onClick={() => {
                                    setEditingItem(null);
                                    setShowGoalModal(true);
                                }}
                            >
                                <Plus size={32} />
                                <span>Nova Meta</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Account Modal */}
            {showAccountModal && (
                <AccountModal
                    account={editingItem}
                    onClose={() => {
                        setShowAccountModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveAccount}
                />
            )}

            {/* Transaction Modal */}
            {showTransactionModal && (
                <TransactionModal
                    transaction={editingItem}
                    accounts={accounts}
                    categories={categories}
                    onClose={() => {
                        setShowTransactionModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveTransaction}
                />
            )}

            {/* Goal Modal */}
            {showGoalModal && (
                <GoalModal
                    goal={editingItem}
                    onClose={() => {
                        setShowGoalModal(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveGoal}
                />
            )}
        </div>
    );
}

// Account Modal Component
function AccountModal({ account, onClose, onSave }: {
    account?: Account | null;
    onClose: () => void;
    onSave: (data: Partial<Account>) => void;
}) {
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState(account?.type || 'CHECKING');
    const [balance, setBalance] = useState(account?.balance?.toString() || '0');
    const [institution, setInstitution] = useState(account?.institution || '');
    const [color, setColor] = useState(account?.color || '#3b82f6');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            type,
            balance: parseFloat(balance),
            institution,
            color,
            currency: 'BRL'
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{account ? 'Editar Conta' : 'Nova Conta'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Nome da Conta</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Conta Corrente"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Tipo</label>
                                <select value={type} onChange={e => setType(e.target.value)}>
                                    <option value="CHECKING">Conta Corrente</option>
                                    <option value="SAVINGS">Poupança</option>
                                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                                    <option value="INVESTMENT">Investimento</option>
                                    <option value="CASH">Dinheiro</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Saldo Inicial</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={balance}
                                    onChange={e => setBalance(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Instituição</label>
                                <input
                                    type="text"
                                    value={institution}
                                    onChange={e => setInstitution(e.target.value)}
                                    placeholder="Ex: Nubank"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Cor</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={e => setColor(e.target.value)}
                                />
                            </div>
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

// Transaction Modal Component
function TransactionModal({ transaction, accounts, categories, onClose, onSave }: {
    transaction?: Transaction | null;
    accounts: Account[];
    categories: Category[];
    onClose: () => void;
    onSave: (data: Partial<Transaction>) => void;
}) {
    const [description, setDescription] = useState(transaction?.description || '');
    const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
    const [type, setType] = useState<TransactionType>(transaction?.type || TransactionType.EXPENSE);
    const [date, setDate] = useState(transaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState(transaction?.accountId || accounts[0]?.id || '');
    const [categoryId, setCategoryId] = useState(transaction?.categoryId || '');

    const filteredCategories = categories.filter(c => c.type === type);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            description,
            amount: parseFloat(amount),
            type,
            date: new Date(date).toISOString(),
            accountId,
            categoryId: categoryId || undefined
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{transaction ? 'Editar Transação' : 'Nova Transação'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.typeSelector}>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === TransactionType.EXPENSE ? styles.active : ''}`}
                                onClick={() => setType(TransactionType.EXPENSE)}
                            >
                                <ArrowUpRight size={18} />
                                Despesa
                            </button>
                            <button
                                type="button"
                                className={`${styles.typeBtn} ${type === TransactionType.INCOME ? styles.active : ''}`}
                                onClick={() => setType(TransactionType.INCOME)}
                            >
                                <ArrowDownRight size={18} />
                                Receita
                            </button>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Descrição</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Ex: Supermercado"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Valor</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Data</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Conta</label>
                                <select value={accountId} onChange={e => setAccountId(e.target.value)} required>
                                    <option value="">Selecione...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Categoria</label>
                                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                    <option value="">Sem categoria</option>
                                    {filteredCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
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

// Goal Modal Component
function GoalModal({ goal, onClose, onSave }: {
    goal?: Goal | null;
    onClose: () => void;
    onSave: (data: Partial<Goal>) => void;
}) {
    const [name, setName] = useState(goal?.name || '');
    const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
    const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount?.toString() || '0');
    const [deadline, setDeadline] = useState(goal?.deadline?.split('T')[0] || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            targetAmount: parseFloat(targetAmount),
            currentAmount: parseFloat(currentAmount),
            deadline: deadline ? new Date(deadline).toISOString() : undefined
        });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>{goal ? 'Editar Meta' : 'Nova Meta'}</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Nome da Meta</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: Viagem de férias"
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Valor da Meta</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={targetAmount}
                                    onChange={e => setTargetAmount(e.target.value)}
                                    placeholder="0,00"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Valor Atual</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={currentAmount}
                                    onChange={e => setCurrentAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Prazo (opcional)</label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
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
