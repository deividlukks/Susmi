'use client'

import {
  CheckSquare,
  Calendar,
  Target,
  LayoutDashboard,
  Brain,
  Zap,
  Users,
  Bell,
  Search,
  BarChart3,
  Workflow,
  Mic,
} from 'lucide-react'

const features = [
  {
    icon: CheckSquare,
    title: 'Gestão de Tarefas',
    description: 'CRUD completo com prioridades, categorias, tags e status personalizáveis.',
  },
  {
    icon: Target,
    title: 'Rastreamento de Hábitos',
    description: 'Check-ins diários, streaks, frequência e estatísticas de consistência.',
  },
  {
    icon: LayoutDashboard,
    title: 'Projetos Kanban',
    description: 'Quadros Kanban com colunas, cards, milestones e gerenciamento de equipe.',
  },
  {
    icon: Calendar,
    title: 'Calendário Integrado',
    description: 'Eventos com recorrência, sincronização com Google Calendar e notificações.',
  },
  {
    icon: Brain,
    title: 'Agentes de IA',
    description: 'Susmi.Core, Susmi.Agenda e Susmi.Habits para automação inteligente.',
  },
  {
    icon: Zap,
    title: 'Automação de Workflows',
    description: 'Engine de automação para executar ações baseadas em triggers.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Avançado',
    description: 'Dashboard com métricas, gráficos e relatórios de produtividade.',
  },
  {
    icon: Bell,
    title: 'Notificações em Tempo Real',
    description: 'WebSocket para notificações instantâneas e atualizações live.',
  },
  {
    icon: Search,
    title: 'Busca Global',
    description: 'Pesquisa unificada com filtros avançados (Cmd/Ctrl + K).',
  },
  {
    icon: Mic,
    title: 'Interface de Voz',
    description: 'Speech-to-Text e Text-to-Speech para comandos por voz.',
  },
  {
    icon: Users,
    title: 'Colaboração',
    description: 'Compartilhamento de projetos, membros e papéis de equipe.',
  },
  {
    icon: Workflow,
    title: 'Integrações',
    description: 'Google Calendar, Todoist, Notion, Telegram Bot e mais.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Funcionalidades Completas
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Tudo que você precisa para organizar sua vida pessoal e profissional em uma única plataforma
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="p-6 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all hover:shadow-lg group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
