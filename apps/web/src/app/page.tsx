import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.hero}>
                <div className={styles.glowOrb} />

                <h1 className={styles.title}>
                    <span className="text-gradient">S.U.S.M.I</span>
                </h1>

                <p className={styles.subtitle}>
                    Seu Assistente Inteligente Pessoal
                </p>

                <p className={styles.description}>
                    Automatize tarefas, gerencie sua agenda e converse com uma IA avançada.
                    Inspirado no JARVIS, construído para você.
                </p>

                <div className={styles.actions}>
                    <Link href="/login" className={styles.primaryButton}>
                        Começar Agora
                    </Link>
                    <Link href="#features" className={styles.secondaryButton}>
                        Saiba Mais
                    </Link>
                </div>
            </div>

            <section id="features" className={styles.features}>
                <h2 className={styles.sectionTitle}>Recursos</h2>

                <div className={styles.featureGrid}>
                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🤖</div>
                        <h3>Assistente IA</h3>
                        <p>Converse naturalmente e obtenha ajuda para qualquer tarefa</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>📋</div>
                        <h3>Gestão de Tarefas</h3>
                        <p>Organize e priorize suas atividades automaticamente</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>🔗</div>
                        <h3>Integrações</h3>
                        <p>Conecte seus serviços favoritos em um só lugar</p>
                    </div>

                    <div className={styles.featureCard}>
                        <div className={styles.featureIcon}>⚡</div>
                        <h3>Automações</h3>
                        <p>Crie fluxos automáticos para tarefas repetitivas</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
