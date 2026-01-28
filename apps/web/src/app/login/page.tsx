'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';
import styles from './page.module.css';

type LoginStep = 'email' | 'password' | 'register';

// Usar o proxy do Next.js para evitar problemas de CORS
const API_URL = '/api/v1';

export default function LoginPage() {
    const [step, setStep] = useState<LoginStep>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [userName, setUserName] = useState<string | undefined>();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.exists) {
                setUserName(data.userName);
                setStep('password');
            } else {
                setStep('register');
            }
        } catch (err: any) {
            setError('Erro ao verificar email. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Credenciais inválidas');
            }

            // Salvar token no localStorage
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Credenciais inválidas');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao criar conta');
            }

            // Salvar token no localStorage
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setError('');
        setPassword('');
        if (step === 'password' || step === 'register') {
            setStep('email');
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.formWrapper}>
                <div className={styles.header}>
                    <h1 className="text-gradient">S.U.S.M.I</h1>
                    <p>
                        {step === 'email' && 'Digite seu email para continuar'}
                        {step === 'password' && `Bem-vindo de volta${userName ? `, ${userName}` : ''}!`}
                        {step === 'register' && 'Crie sua conta'}
                    </p>
                </div>

                {/* Step Indicator */}
                <div className={styles.stepIndicator}>
                    <div className={`${styles.stepDot} ${styles.active}`} />
                    <div className={`${styles.stepLine} ${step !== 'email' ? styles.active : ''}`} />
                    <div className={`${styles.stepDot} ${step !== 'email' ? styles.active : ''}`} />
                </div>

                {/* Step 1: Email */}
                {step === 'email' && (
                    <form onSubmit={handleCheckEmail} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="email">
                                <Mail size={16} />
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                required
                                autoFocus
                                className={styles.input}
                            />
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" disabled={loading || !email} className={styles.submitButton}>
                            {loading ? 'Verificando...' : 'Continuar'}
                        </button>
                    </form>
                )}

                {/* Step 2: Password (Login) */}
                {step === 'password' && (
                    <form onSubmit={handleLogin} className={styles.form}>
                        <div className={styles.emailDisplay}>
                            <Mail size={16} />
                            <span>{email}</span>
                            <button type="button" onClick={handleBack} className={styles.changeButton}>
                                Alterar
                            </button>
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">
                                <Lock size={16} />
                                Senha
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoFocus
                                minLength={6}
                                className={styles.input}
                            />
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" disabled={loading || !password} className={styles.submitButton}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <button type="button" onClick={handleBack} className={styles.backButton}>
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                    </form>
                )}

                {/* Step 2: Register */}
                {step === 'register' && (
                    <form onSubmit={handleRegister} className={styles.form}>
                        <div className={styles.emailDisplay}>
                            <Mail size={16} />
                            <span>{email}</span>
                            <button type="button" onClick={handleBack} className={styles.changeButton}>
                                Alterar
                            </button>
                        </div>

                        <p className={styles.registerNotice}>
                            Este email ainda não está cadastrado. Crie sua conta abaixo:
                        </p>

                        <div className={styles.inputGroup}>
                            <label htmlFor="name">
                                <User size={16} />
                                Nome
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome"
                                autoFocus
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="password">
                                <Lock size={16} />
                                Senha
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                                className={styles.input}
                            />
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" disabled={loading || !password} className={styles.submitButton}>
                            {loading ? 'Criando conta...' : 'Criar Conta'}
                        </button>

                        <button type="button" onClick={handleBack} className={styles.backButton}>
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                    </form>
                )}
            </div>
        </main>
    );
}
