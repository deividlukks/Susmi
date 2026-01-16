'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ProjectsProgressChartProps {
  data: {
    title: string;
    progress: number;
    totalCards: number;
    completedCards: number;
  }[];
}

const getProgressColor = (progress: number) => {
  if (progress < 30) return '#ef4444'; // red
  if (progress < 70) return '#f59e0b'; // orange
  return '#22c55e'; // green
};

export function ProjectsProgressChart({ data }: ProjectsProgressChartProps) {
  const chartData = data.map((project) => ({
    name: project.title.length > 20 ? project.title.substring(0, 20) + '...' : project.title,
    'Progresso (%)': Math.round(project.progress || 0),
    progress: project.progress || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso dos Projetos</CardTitle>
        <CardDescription>Status de conclusão dos projetos ativos</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Progresso (%)" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getProgressColor(entry.progress)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
