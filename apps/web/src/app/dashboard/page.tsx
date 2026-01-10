'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Calendar, Clock, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  upcomingEvents: number;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [tasksRes, eventsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/events/upcoming'),
        ]);

        const tasks = tasksRes.data.items || [];
        const events = eventsRes.data || [];

        setStats({
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t: any) => t.status === 'COMPLETED').length,
          pendingTasks: tasks.filter((t: any) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
            .length,
          upcomingEvents: events.length,
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const cards = [
    {
      title: 'Total de Tarefas',
      value: stats.totalTasks,
      icon: CheckSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Tarefas Concluídas',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Tarefas Pendentes',
      value: stats.pendingTasks,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Eventos Próximos',
      value: stats.upcomingEvents,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo de volta, {user?.name}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`rounded-full p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas Recentes</CardTitle>
            <CardDescription>Suas últimas tarefas criadas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Acesse a página de tarefas para ver mais detalhes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
            <CardDescription>Eventos agendados para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Acesse o calendário para ver mais detalhes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
