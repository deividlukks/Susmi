'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Target, Clock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ProductivityMetrics {
  completionRate: number;
  averageCompletionTime: number;
  totalTimeSpent: number;
  productivityScore: number;
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await api.get('/analytics/productivity');
        setMetrics(response.data);
      } catch (error) {
        toast.error('Erro ao carregar métricas');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600 mt-1">Acompanhe sua produtividade e desempenho</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Carregando métricas...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.completionRate?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Das tarefas foram concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.averageCompletionTime?.toFixed(1) || 0}h
              </div>
              <p className="text-xs text-gray-500 mt-1">Para concluir tarefas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Total</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics?.totalTimeSpent || 0) / 60}h
              </div>
              <p className="text-xs text-gray-500 mt-1">Trabalhadas no total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score de Produtividade</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.productivityScore || 0}</div>
              <p className="text-xs text-gray-500 mt-1">De 100 pontos</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Semanais</CardTitle>
            <CardDescription>Resumo da sua produtividade na semana</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Funcionalidade de relatórios detalhados em desenvolvimento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
