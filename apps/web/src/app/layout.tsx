import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'S.U.S.M.I - Assistente Inteligente Pessoal',
    description: 'Seu assistente inteligente pessoal inspirado no JARVIS',
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body>{children}</body>
        </html>
    );
}
