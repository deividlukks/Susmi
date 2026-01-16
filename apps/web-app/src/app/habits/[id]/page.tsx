'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Flame, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { habitsService } from '@/services/habits.service';
import { HabitCheckInDto } from '@susmi/types';
import { Button } from '@susmi/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { Badge } from '@susmi/ui';

const frequencyLabels = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  CUSTOM: 'Personalizado',
};

export default function HabitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const habitId = params.id as string;

  // Queries
  const { data: habit, isLoading: habitLoading } = useQuery({
    queryKey: ['habit', habitId],
    queryFn: () => habitsService.getHabit(habitId),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['habit-stats', habitId],
    queryFn: () => habitsService.getStats(habitId),
    enabled: !!habitId,
  });

  const currentMonth = new Date();
  const { data: checkIns } = useQuery({
    queryKey: ['habit-check-ins', habitId, currentMonth.getMonth()],
    queryFn: () =>
      habitsService.getCheckIns(
        habitId,
        startOfMonth(currentMonth),
        endOfMonth(currentMonth)
      ),
    enabled: !!habitId,
  });

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: (data: HabitCheckInDto) => habitsService.checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] });
      queryClient.invalidateQueries({ queryKey: ['habit-stats', habitId] });
      queryClient.invalidateQueries({ queryKey: ['habit-check-ins', habitId] });
      toast.success('Check-in realizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao fazer check-in');
    },
  });

  const handleCheckIn = () => {
    checkInMutation.mutate({
      habitId,
      count: 1,
      date: new Date(),
    });
  };

  if (habitLoading || statsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Hábito não encontrado</p>
      </div>
    );
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const checkInDates = (checkIns || []).map((ci) =>
    typeof ci.date === 'string' ? parseISO(ci.date) : ci.date
  );

  const hasCheckIn = (day: Date) => {
    return checkInDates.some((date) => isSameDay(date, day));
  };

  const completionRate = stats?.completionRate || 0;
  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;
  const totalCheckIns = stats?.totalCheckIns || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-3 h-12 rounded"
                style={{ backgroundColor: habit.color }}
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{habit.title}</h1>
                <p className="text-gray-500 mt-1">
                  {habit.description || 'Sem descrição'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Badge>{frequencyLabels[habit.frequency]}</Badge>
              <Badge variant={habit.isActive ? 'default' : 'secondary'}>
                {habit.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>

          <Button onClick={handleCheckIn} disabled={checkInMutation.isPending} size="lg">
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Check-in Hoje
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Sequência Atual
            </CardDescription>
            <CardTitle className="text-4xl text-orange-600">{currentStreak}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Melhor Sequência
            </CardDescription>
            <CardTitle className="text-4xl text-blue-600">{longestStreak}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Total de Check-ins
            </CardDescription>
            <CardTitle className="text-4xl text-green-600">{totalCheckIns}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Taxa de Conclusão
            </CardDescription>
            <CardTitle className="text-4xl text-purple-600">
              {completionRate.toFixed(0)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Calendar Heatmap */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Calendário de Check-ins</CardTitle>
          <CardDescription>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 pb-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days of the month */}
            {daysInMonth.map((day) => {
              const hasCheck = hasCheckIn(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-medium
                    transition-all cursor-default
                    ${hasCheck ? 'bg-green-500 text-white border-green-600' : 'bg-gray-100 text-gray-600 border-gray-200'}
                    ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  `}
                  title={hasCheck ? `Check-in em ${format(day, 'dd/MM/yyyy')}` : ''}
                >
                  {format(day, 'd')}
                  {hasCheck && <CheckCircle2 className="absolute h-3 w-3 mt-6" />}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Com check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200" />
              <span>Sem check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200 ring-2 ring-blue-500" />
              <span>Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente</CardTitle>
          <CardDescription>Últimos check-ins realizados</CardDescription>
        </CardHeader>
        <CardContent>
          {!checkIns || checkIns.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Nenhum check-in realizado este mês</p>
          ) : (
            <div className="space-y-3">
              {checkIns
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 10)
                .map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">
                          {format(
                            typeof checkIn.date === 'string'
                              ? parseISO(checkIn.date)
                              : checkIn.date,
                            "dd 'de' MMMM",
                            { locale: ptBR }
                          )}
                        </p>
                        {checkIn.note && (
                          <p className="text-sm text-gray-600">{checkIn.note}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {format(
                        typeof checkIn.date === 'string'
                          ? parseISO(checkIn.date)
                          : checkIn.date,
                        'HH:mm'
                      )}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
