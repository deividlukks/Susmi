'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HabitsCompletionChartProps {
  data: {
    title: string;
    currentStreak: number;
    totalCheckIns: number;
  }[];
}

export function HabitsCompletionChart({ data }: HabitsCompletionChartProps) {
  const chartData = data.map((habit) => ({
    name: habit.title.length > 15 ? habit.title.substring(0, 15) + '...' : habit.title,
    'Sequência Atual': habit.currentStreak,
    'Total de Check-ins': habit.totalCheckIns,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho de Hábitos</CardTitle>
        <CardDescription>Sequência e total de check-ins</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sequência Atual" fill="#8b5cf6" />
            <Bar dataKey="Total de Check-ins" fill="#06b6d4" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
