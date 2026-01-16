'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityTimelineChartProps {
  data: {
    date: Date;
    tasks: number;
    habits: number;
    events: number;
  }[];
}

export function ActivityTimelineChart({ data }: ActivityTimelineChartProps) {
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
    Tarefas: item.tasks,
    Hábitos: item.habits,
    Eventos: item.events,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades ao Longo do Tempo</CardTitle>
        <CardDescription>Últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Tarefas" stroke="#22c55e" strokeWidth={2} />
            <Line type="monotone" dataKey="Hábitos" stroke="#8b5cf6" strokeWidth={2} />
            <Line type="monotone" dataKey="Eventos" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
