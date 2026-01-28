'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Mail, MessageCircle, Send, Inbox, Archive, Trash2, Star,
    Search, Filter, RefreshCw, Plus, X, ChevronRight, Check,
    ExternalLink, Phone, Settings, Link2, Unlink
} from 'lucide-react';
import styles from './page.module.css';
import { apiClient } from '@/lib/api-client';

interface EmailAccount {
    id: string;
    email: string;
    provider: string;
    isConnected: boolean;
    lastSynced?: string;
}

interface Email {
    id: string;
    from: string;
    to: string[];
    subject: string;
    body: string;
    preview: string;
    isRead: boolean;
    isStarred: boolean;
    isArchived: boolean;
    receivedAt: string;
    labels?: string[];
}

interface WhatsAppContact {
    id: string;
    name: string;
    phone: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
}

interface TelegramChat {
    id: string;
    name: string;
    type: 'private' | 'group' | 'channel';
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
}

type Tab = 'email' | 'whatsapp' | 'telegram' | 'settings';

export default function CommunicationsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('email');
    const [loading, setLoading] = useState(true);

    // Email state
    const [emails, setEmails] = useState<Email[]>([]);
    const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [emailFolder, setEmailFolder] = useState<'inbox' | 'starred' | 'archived' | 'trash'>('inbox');

    // WhatsApp state
    const [whatsappContacts, setWhatsappContacts] = useState<WhatsAppContact[]>([]);
    const [whatsappConnected, setWhatsappConnected] = useState(false);

    // Telegram state
    const [telegramChats, setTelegramChats] = useState<TelegramChat[]>([]);
    const [telegramConnected, setTelegramConnected] = useState(false);

    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [showComposeModal, setShowComposeModal] = useState(false);

    /**
     * Communications Page - Refatorado com DRY
     *
     * ELIMINA DUPLICAÇÃO: Usa apiClient em vez de getHeaders duplicado
     */
    const fetchData = useCallback(async () => {
        try {
            const [accountsData, emailsData, whatsappData, telegramData] = await Promise.all([
                apiClient.get<any>('/communications/email/accounts'),
                apiClient.get<any>(`/communications/email/messages?folder=${emailFolder}`),
                apiClient.get<any>('/communications/whatsapp/status'),
                apiClient.get<any>('/communications/telegram/status'),
            ]);

            setEmailAccounts(Array.isArray(accountsData) ? accountsData : accountsData.data || []);
            setEmails(Array.isArray(emailsData) ? emailsData : emailsData.data || []);
            setWhatsappConnected(whatsappData.connected || false);
            setWhatsappContacts(whatsappData.contacts || []);
            setTelegramConnected(telegramData.connected || false);
            setTelegramChats(telegramData.chats || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, [emailFolder]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSendEmail = async (emailData: { to: string; subject: string; body: string }) => {
        try {
            await apiClient.post('/communications/email/send', emailData);
            setShowComposeModal(false);
            fetchData();
        } catch (error) {
            console.error('Erro ao enviar email:', error);
        }
    };

    const handleToggleStar = async (emailId: string) => {
        try {
            await apiClient.post(`/communications/email/messages/${emailId}/star`, {});
            fetchData();
        } catch (error) {
            console.error('Erro ao marcar email:', error);
        }
    };

    const handleArchiveEmail = async (emailId: string) => {
        try {
            await apiClient.post(`/communications/email/messages/${emailId}/archive`, {});
            fetchData();
        } catch (error) {
            console.error('Erro ao arquivar email:', error);
        }
    };

    const handleDeleteEmail = async (emailId: string) => {
        try {
            await apiClient.delete(`/communications/email/messages/${emailId}`);
            fetchData();
        } catch (error) {
            console.error('Erro ao excluir email:', error);
        }
    };

    const handleConnectWhatsApp = async () => {
        try {
            const data = await apiClient.post<any>('/communications/whatsapp/connect', {});
            // Handle QR code or connection status
            if (data.qrCode) {
                // Show QR code modal
            }
            fetchData();
        } catch (error) {
            console.error('Erro ao conectar WhatsApp:', error);
        }
    };

    const handleConnectTelegram = async () => {
        try {
            const data = await apiClient.post<any>('/communications/telegram/connect', {});
            // Handle connection flow
            fetchData();
        } catch (error) {
            console.error('Erro ao conectar Telegram:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const filteredEmails = emails.filter(email => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return email.subject.toLowerCase().includes(query) ||
                   email.from.toLowerCase().includes(query) ||
                   email.preview.toLowerCase().includes(query);
        }
        return true;
    });

    const tabs = [
        { id: 'email' as Tab, label: 'Email', icon: Mail, count: emails.filter(e => !e.isRead).length },
        { id: 'whatsapp' as Tab, label: 'WhatsApp', icon: MessageCircle, count: whatsappContacts.reduce((sum, c) => sum + c.unreadCount, 0) },
        { id: 'telegram' as Tab, label: 'Telegram', icon: Send, count: telegramChats.reduce((sum, c) => sum + c.unreadCount, 0) },
        { id: 'settings' as Tab, label: 'Configurações', icon: Settings, count: 0 },
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>Comunicações</h1>
                    <p>Gerencie seus emails, WhatsApp e Telegram</p>
                </div>
                {activeTab === 'email' && (
                    <button className={styles.addButton} onClick={() => setShowComposeModal(true)}>
                        <Plus size={20} />
                        Novo Email
                    </button>
                )}
            </header>

            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count > 0 && <span className={styles.badge}>{tab.count}</span>}
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'email' && (
                    <div className={styles.emailLayout}>
                        <div className={styles.emailSidebar}>
                            <div className={styles.searchBox}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar emails..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <nav className={styles.folderNav}>
                                <button
                                    className={`${styles.folderBtn} ${emailFolder === 'inbox' ? styles.active : ''}`}
                                    onClick={() => setEmailFolder('inbox')}
                                >
                                    <Inbox size={18} />
                                    Caixa de Entrada
                                </button>
                                <button
                                    className={`${styles.folderBtn} ${emailFolder === 'starred' ? styles.active : ''}`}
                                    onClick={() => setEmailFolder('starred')}
                                >
                                    <Star size={18} />
                                    Favoritos
                                </button>
                                <button
                                    className={`${styles.folderBtn} ${emailFolder === 'archived' ? styles.active : ''}`}
                                    onClick={() => setEmailFolder('archived')}
                                >
                                    <Archive size={18} />
                                    Arquivados
                                </button>
                                <button
                                    className={`${styles.folderBtn} ${emailFolder === 'trash' ? styles.active : ''}`}
                                    onClick={() => setEmailFolder('trash')}
                                >
                                    <Trash2 size={18} />
                                    Lixeira
                                </button>
                            </nav>
                        </div>

                        <div className={styles.emailList}>
                            <div className={styles.listHeader}>
                                <span>{filteredEmails.length} emails</span>
                                <button onClick={() => fetchData()} title="Atualizar">
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                            {filteredEmails.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Inbox size={48} />
                                    <p>Nenhum email encontrado</p>
                                </div>
                            ) : (
                                filteredEmails.map(email => (
                                    <div
                                        key={email.id}
                                        className={`${styles.emailItem} ${!email.isRead ? styles.unread : ''} ${selectedEmail?.id === email.id ? styles.selected : ''}`}
                                        onClick={() => setSelectedEmail(email)}
                                    >
                                        <button
                                            className={`${styles.starBtn} ${email.isStarred ? styles.starred : ''}`}
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleToggleStar(email.id);
                                            }}
                                        >
                                            <Star size={16} />
                                        </button>
                                        <div className={styles.emailItemContent}>
                                            <div className={styles.emailItemHeader}>
                                                <span className={styles.emailFrom}>{email.from}</span>
                                                <span className={styles.emailDate}>{formatDate(email.receivedAt)}</span>
                                            </div>
                                            <span className={styles.emailSubject}>{email.subject}</span>
                                            <span className={styles.emailPreview}>{email.preview}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className={styles.emailDetail}>
                            {selectedEmail ? (
                                <>
                                    <div className={styles.detailHeader}>
                                        <h2>{selectedEmail.subject}</h2>
                                        <div className={styles.detailActions}>
                                            <button onClick={() => handleArchiveEmail(selectedEmail.id)} title="Arquivar">
                                                <Archive size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteEmail(selectedEmail.id)} title="Excluir">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className={styles.detailMeta}>
                                        <div className={styles.detailFrom}>
                                            <strong>De:</strong> {selectedEmail.from}
                                        </div>
                                        <div className={styles.detailTo}>
                                            <strong>Para:</strong> {selectedEmail.to.join(', ')}
                                        </div>
                                        <div className={styles.detailDate}>
                                            {new Date(selectedEmail.receivedAt).toLocaleString('pt-BR')}
                                        </div>
                                    </div>
                                    <div className={styles.detailBody}>
                                        {selectedEmail.body}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.noEmailSelected}>
                                    <Mail size={48} />
                                    <p>Selecione um email para visualizar</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div className={styles.messagingLayout}>
                        {!whatsappConnected ? (
                            <div className={styles.connectPrompt}>
                                <div className={styles.connectIcon}>
                                    <MessageCircle size={48} />
                                </div>
                                <h2>Conectar WhatsApp</h2>
                                <p>Conecte sua conta do WhatsApp para gerenciar suas mensagens diretamente aqui.</p>
                                <button className={styles.connectBtn} onClick={handleConnectWhatsApp}>
                                    <Link2 size={20} />
                                    Conectar WhatsApp
                                </button>
                            </div>
                        ) : (
                            <div className={styles.chatLayout}>
                                <div className={styles.chatList}>
                                    <div className={styles.searchBox}>
                                        <Search size={18} />
                                        <input type="text" placeholder="Buscar conversas..." />
                                    </div>
                                    {whatsappContacts.map(contact => (
                                        <div key={contact.id} className={styles.chatItem}>
                                            <div className={styles.chatAvatar}>
                                                {contact.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={styles.chatInfo}>
                                                <div className={styles.chatHeader}>
                                                    <span className={styles.chatName}>{contact.name}</span>
                                                    {contact.lastMessageAt && (
                                                        <span className={styles.chatTime}>
                                                            {formatDate(contact.lastMessageAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={styles.chatPreview}>{contact.lastMessage}</span>
                                            </div>
                                            {contact.unreadCount > 0 && (
                                                <span className={styles.unreadBadge}>{contact.unreadCount}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.chatView}>
                                    <div className={styles.selectChat}>
                                        <MessageCircle size={48} />
                                        <p>Selecione uma conversa para visualizar</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'telegram' && (
                    <div className={styles.messagingLayout}>
                        {!telegramConnected ? (
                            <div className={styles.connectPrompt}>
                                <div className={styles.connectIcon}>
                                    <Send size={48} />
                                </div>
                                <h2>Conectar Telegram</h2>
                                <p>Conecte sua conta do Telegram para gerenciar suas mensagens e canais.</p>
                                <button className={styles.connectBtn} onClick={handleConnectTelegram}>
                                    <Link2 size={20} />
                                    Conectar Telegram
                                </button>
                            </div>
                        ) : (
                            <div className={styles.chatLayout}>
                                <div className={styles.chatList}>
                                    <div className={styles.searchBox}>
                                        <Search size={18} />
                                        <input type="text" placeholder="Buscar chats..." />
                                    </div>
                                    {telegramChats.map(chat => (
                                        <div key={chat.id} className={styles.chatItem}>
                                            <div className={styles.chatAvatar}>
                                                {chat.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className={styles.chatInfo}>
                                                <div className={styles.chatHeader}>
                                                    <span className={styles.chatName}>{chat.name}</span>
                                                    {chat.lastMessageAt && (
                                                        <span className={styles.chatTime}>
                                                            {formatDate(chat.lastMessageAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={styles.chatPreview}>{chat.lastMessage}</span>
                                            </div>
                                            {chat.unreadCount > 0 && (
                                                <span className={styles.unreadBadge}>{chat.unreadCount}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.chatView}>
                                    <div className={styles.selectChat}>
                                        <Send size={48} />
                                        <p>Selecione um chat para visualizar</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className={styles.settingsLayout}>
                        <div className={styles.settingsSection}>
                            <h2>Contas de Email</h2>
                            <div className={styles.accountsList}>
                                {emailAccounts.length === 0 ? (
                                    <div className={styles.noAccounts}>
                                        <p>Nenhuma conta de email conectada</p>
                                        <button className={styles.addAccountBtn}>
                                            <Plus size={18} />
                                            Adicionar Conta
                                        </button>
                                    </div>
                                ) : (
                                    emailAccounts.map(account => (
                                        <div key={account.id} className={styles.accountItem}>
                                            <div className={styles.accountInfo}>
                                                <Mail size={24} />
                                                <div>
                                                    <span className={styles.accountEmail}>{account.email}</span>
                                                    <span className={styles.accountProvider}>{account.provider}</span>
                                                </div>
                                            </div>
                                            <div className={styles.accountStatus}>
                                                {account.isConnected ? (
                                                    <span className={styles.connected}>
                                                        <Check size={16} /> Conectado
                                                    </span>
                                                ) : (
                                                    <span className={styles.disconnected}>Desconectado</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.settingsSection}>
                            <h2>WhatsApp</h2>
                            <div className={styles.integrationCard}>
                                <div className={styles.integrationInfo}>
                                    <MessageCircle size={32} />
                                    <div>
                                        <h3>WhatsApp Business</h3>
                                        <p>Gerencie suas mensagens do WhatsApp</p>
                                    </div>
                                </div>
                                <div className={styles.integrationActions}>
                                    {whatsappConnected ? (
                                        <>
                                            <span className={styles.connected}><Check size={16} /> Conectado</span>
                                            <button className={styles.disconnectBtn}>
                                                <Unlink size={16} /> Desconectar
                                            </button>
                                        </>
                                    ) : (
                                        <button className={styles.connectBtn} onClick={handleConnectWhatsApp}>
                                            <Link2 size={16} /> Conectar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.settingsSection}>
                            <h2>Telegram</h2>
                            <div className={styles.integrationCard}>
                                <div className={styles.integrationInfo}>
                                    <Send size={32} />
                                    <div>
                                        <h3>Telegram Bot</h3>
                                        <p>Integre com seu bot do Telegram</p>
                                    </div>
                                </div>
                                <div className={styles.integrationActions}>
                                    {telegramConnected ? (
                                        <>
                                            <span className={styles.connected}><Check size={16} /> Conectado</span>
                                            <button className={styles.disconnectBtn}>
                                                <Unlink size={16} /> Desconectar
                                            </button>
                                        </>
                                    ) : (
                                        <button className={styles.connectBtn} onClick={handleConnectTelegram}>
                                            <Link2 size={16} /> Conectar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Compose Email Modal */}
            {showComposeModal && (
                <ComposeEmailModal
                    onClose={() => setShowComposeModal(false)}
                    onSend={handleSendEmail}
                />
            )}
        </div>
    );
}

function ComposeEmailModal({ onClose, onSend }: {
    onClose: () => void;
    onSend: (data: { to: string; subject: string; body: string }) => void;
}) {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend({ to, subject, body });
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Novo Email</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label>Para</label>
                            <input
                                type="email"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                placeholder="email@exemplo.com"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Assunto</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="Assunto do email"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Mensagem</label>
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Escreva sua mensagem..."
                                rows={10}
                                required
                            />
                        </div>
                    </div>
                    <div className={styles.modalFooter}>
                        <button type="button" onClick={onClose} className={styles.btnSecondary}>
                            Cancelar
                        </button>
                        <button type="submit" className={styles.btnPrimary}>
                            <Send size={18} />
                            Enviar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
