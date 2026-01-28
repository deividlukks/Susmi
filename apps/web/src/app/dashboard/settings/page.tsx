'use client';

import styles from './page.module.css';

export default function SettingsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Configurações</h1>
                <p>Personalize sua experiência</p>
            </header>

            <div className={styles.sections}>
                <section className={styles.section}>
                    <h2>Perfil</h2>
                    <div className={styles.field}>
                        <label>Nome</label>
                        <input type="text" placeholder="Seu nome" className={styles.input} />
                    </div>
                    <div className={styles.field}>
                        <label>Email</label>
                        <input type="email" placeholder="seu@email.com" className={styles.input} disabled />
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Preferências</h2>
                    <div className={styles.field}>
                        <label>Tema</label>
                        <select className={styles.select}>
                            <option value="dark">Escuro</option>
                            <option value="light">Claro</option>
                            <option value="system">Sistema</option>
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label>Idioma</label>
                        <select className={styles.select}>
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>IA</h2>
                    <div className={styles.field}>
                        <label>Modelo Preferido</label>
                        <select className={styles.select}>
                            <option value="gpt-4">GPT-4</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            <option value="claude-3">Claude 3</option>
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label>Temperatura (Criatividade)</label>
                        <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className={styles.range} />
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Notificações</h2>
                    <div className={styles.toggle}>
                        <label>Notificações por email</label>
                        <input type="checkbox" defaultChecked />
                    </div>
                    <div className={styles.toggle}>
                        <label>Lembretes de tarefas</label>
                        <input type="checkbox" defaultChecked />
                    </div>
                </section>
            </div>

            <div className={styles.actions}>
                <button className={styles.saveButton}>Salvar Alterações</button>
            </div>
        </div>
    );
}
