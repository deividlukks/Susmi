'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import styles from './page.module.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! Sou o S.U.S.M.I, seu assistente inteligente pessoal. Como posso ajudar você hoje?',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Simulate AI response (replace with actual API call)
        setTimeout(() => {
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Entendi sua mensagem: "${userMessage.content}". Em breve, terei integração completa com IA para responder suas perguntas de forma inteligente!`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Chat com S.U.S.M.I</h1>
                <p>Converse com seu assistente inteligente</p>
            </header>

            <div className={styles.chatArea}>
                <div className={styles.messages}>
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage
                                }`}
                        >
                            <div className={styles.messageAvatar}>
                                {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                            <div className={styles.messageContent}>
                                <p>{message.content}</p>
                                <span className={styles.timestamp}>
                                    {message.timestamp.toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className={`${styles.message} ${styles.assistantMessage}`}>
                            <div className={styles.messageAvatar}>
                                <Bot size={20} />
                            </div>
                            <div className={styles.messageContent}>
                                <Loader2 className={styles.loadingIcon} size={20} />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className={styles.inputArea}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className={styles.input}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className={styles.sendButton}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
