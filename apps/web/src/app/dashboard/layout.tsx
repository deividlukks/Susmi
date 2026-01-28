'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import styles from './layout.module.css';

interface User {
    id: string;
    email: string;
    name?: string;
    role: string;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Verificar se está autenticado
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        try {
            setUser(JSON.parse(userData));
        } catch {
            router.push('/login');
            return;
        }

        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Carregando...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className={styles.layout}>
            <Sidebar user={user} />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
