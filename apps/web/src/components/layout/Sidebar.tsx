'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    MessageSquare,
    CheckSquare,
    Settings,
    LogOut,
    Bot,
    Wallet,
    Calendar,
    Heart,
    Mail,
    Home,
    Zap,
    BookOpen,
    ChevronDown,
    ChevronRight,
    Shield,
    Users
} from 'lucide-react';
import { useState } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
    user: { email?: string; name?: string };
}

interface NavItem {
    href: string;
    label: string;
    icon: any;
    children?: NavItem[];
}

const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/chat', label: 'Chat IA', icon: MessageSquare },
    { href: '/dashboard/tasks', label: 'Tarefas', icon: CheckSquare },
    { href: '/dashboard/calendar', label: 'Calendário', icon: Calendar },
    { href: '/dashboard/finance', label: 'Finanças', icon: Wallet },
    { href: '/dashboard/health', label: 'Saúde', icon: Heart },
    { href: '/dashboard/communications', label: 'Comunicações', icon: Mail },
    { href: '/dashboard/home-automation', label: 'Casa Inteligente', icon: Home },
    { href: '/dashboard/automations', label: 'Automações', icon: Zap },
    { href: '/dashboard/agents', label: 'Agentes IA', icon: Users },
    { href: '/dashboard/governance', label: 'Governança', icon: Shield },
    { href: '/dashboard/knowledge', label: 'Conhecimento', icon: BookOpen },
    { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logo}>
                <Bot className={styles.logoIcon} />
                <span className="text-gradient">S.U.S.M.I</span>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                        {user.name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className={styles.userDetails}>
                        <p className={styles.userName}>
                            {user.name || 'Usuário'}
                        </p>
                        <p className={styles.userEmail}>{user.email}</p>
                    </div>
                </div>

                <button onClick={handleLogout} className={styles.logoutButton}>
                    <LogOut size={18} />
                    <span>Sair</span>
                </button>
            </div>
        </aside>
    );
}
