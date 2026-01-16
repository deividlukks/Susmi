'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TasksStatusChartProps {
  data: {
    status: string;
    count: number;
  }[];
}

const COLORS = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
};

const STATUS_LABELS = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Progresso',
  COMPLETED: 'Concluídas',
  CANCELLED: 'Canceladas',
};

export function TasksStatusChart({ data }: TasksStatusChartProps) {
  const chartData = data.map((item) => ({
    name: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status,
    value: item.count,
    color: COLORS[item.status as keyof typeof COLORS] || '#gray',
  }));

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas por Status</CardTitle>
        <CardDescription>Distribuição de {total} tarefas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
