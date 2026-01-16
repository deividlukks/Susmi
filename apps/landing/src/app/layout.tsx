import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'S.U.S.M.I - Sistema de Produtividade Inteligente',
  description: 'Simplesmente Um Sistema Muito Inteligente para gerenciar tarefas, hábitos, projetos e calendário com IA integrada',
  keywords: ['produtividade', 'gestão de tarefas', 'hábitos', 'kanban', 'calendário', 'IA'],
  authors: [{ name: 'S.U.S.M.I Team' }],
  openGraph: {
    title: 'S.U.S.M.I - Sistema de Produtividade Inteligente',
    description: 'Plataforma completa de produtividade com IA',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
