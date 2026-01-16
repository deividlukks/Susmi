'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { calendarService } from '@/services/calendar.service';
import { eventsService } from '@/services/events.service';
import { CalendarItemType, EventType, EventRecurrence } from '@susmi/types';
import { Card, CardContent, CardHeader, CardTitle } from '@susmi/ui';
import { Button } from '@susmi/ui';
import { Badge } from '@susmi/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@susmi/ui';
import { Input } from '@susmi/ui';
import { Label } from '@susmi/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@susmi/ui';

const createEventSchema = z.object({
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres'),
  description: z.string().optional(),
  type: z.nativeEnum(EventType),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().default(false),
  recurrence: z.nativeEnum(EventRecurrence).default(EventRecurrence.NONE),
  color: z.string().optional(),
});

type CreateEventForm = z.infer<typeof createEventSchema>;

const itemTypeLabels: Record<CalendarItemType, string> = {
  EVENT: 'Evento',
  TASK: 'Tarefa',
  HABIT: 'Hábito',
};

const itemTypeColors: Record<CalendarItemType, string> = {
  EVENT: 'bg-blue-500',
  TASK: 'bg-green-500',
  HABIT: 'bg-purple-500',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<CalendarItemType[]>([
    CalendarItemType.EVENT,
    CalendarItemType.TASK,
    CalendarItemType.HABIT,
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const form = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      type: EventType.PERSONAL,
      startDate: '',
      endDate: '',
      location: '',
      isAllDay: false,
      recurrence: EventRecurrence.NONE,
      color: '#3b82f6',
    },
  });

  const createEventMutation = useMutation({
    mutationFn: eventsService.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-items'] });
      toast.success('Evento criado com sucesso!');
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar evento');
    },
  });

  const handleCreateEvent = (data: CreateEventForm) => {
    createEventMutation.mutate({
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  };

  const openCreateModal = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd'T'HH:mm");
      form.setValue('startDate', dateStr);
      form.setValue('endDate', dateStr);
    }
    setIsCreateModalOpen(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Query calendar items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['calendar-items', monthStart, monthEnd, selectedTypes],
    queryFn: () =>
      calendarService.getItems({
        startDate: monthStart,
        endDate: monthEnd,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
      }),
  });

  const daysInCalendar = eachDayOfInterval({ start: startDate, end: endDate });

  const getItemsForDay = (day: Date) => {
    return items.filter((item) => {
      const itemDate =
        typeof item.startDate === 'string' ? parseISO(item.startDate) : item.startDate;
      return isSameDay(itemDate, day);
    });
  };

  const toggleTypeFilter = (type: CalendarItemType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const selectedDayItems = selectedDate ? getItemsForDay(selectedDate) : [];

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
        <p className="text-gray-500 mt-1">
          Visualize seus eventos, tarefas e hábitos em um só lugar
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filtros</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(['EVENT', 'TASK', 'HABIT'] as CalendarItemType[]).map((type) => (
              <Button
                key={type}
                variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleTypeFilter(type)}
                className="flex items-center gap-2"
              >
                <div className={`w-3 h-3 rounded-full ${itemTypeColors[type]}`} />
                {itemTypeLabels[type]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Week days header */}
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-sm font-semibold text-gray-600 py-2"
                    >
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {daysInCalendar.map((day) => {
                    const dayItems = getItemsForDay(day);
                    const isCurrentMonth =
                      day.getMonth() === currentDate.getMonth();
                    const isDayToday = isToday(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                          ${!isCurrentMonth ? 'bg-gray-50 opacity-40' : 'bg-white hover:bg-gray-50'}
                          ${isDayToday ? 'ring-2 ring-blue-500' : ''}
                          ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''}
                        `}
                      >
                        <div
                          className={`
                          text-sm font-medium mb-1
                          ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                          ${isDayToday ? 'text-blue-600 font-bold' : ''}
                        `}
                        >
                          {format(day, 'd')}
                        </div>

                        {/* Items dots */}
                        <div className="space-y-1">
                          {dayItems.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className={`text-xs p-1 rounded truncate ${
                                item.type === 'EVENT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.type === 'TASK'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                              title={item.title}
                            >
                              {item.title}
                            </div>
                          ))}
                          {dayItems.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayItems.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Day Details */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {selectedDate
                    ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                    : 'Selecione um dia'}
                </CardTitle>
                {selectedDate && (
                  <Button
                    size="sm"
                    onClick={openCreateModal}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Evento
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-center text-gray-500 py-8">
                  Clique em um dia para ver os detalhes
                </p>
              ) : selectedDayItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Nenhum item neste dia</p>
                  <Button onClick={openCreateModal} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Evento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {selectedDayItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <Badge
                          variant="secondary"
                          className={
                            item.type === 'EVENT'
                              ? 'bg-blue-100 text-blue-800'
                              : item.type === 'TASK'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }
                        >
                          {itemTypeLabels[item.type]}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        {item.isAllDay ? (
                          <span>Dia inteiro</span>
                        ) : (
                          <span>
                            {format(
                              typeof item.startDate === 'string'
                                ? parseISO(item.startDate)
                                : item.startDate,
                              'HH:mm'
                            )}
                            {item.endDate &&
                              ` - ${format(
                                typeof item.endDate === 'string'
                                  ? parseISO(item.endDate)
                                  : item.endDate,
                                'HH:mm'
                              )}`}
                          </span>
                        )}
                      </div>

                      {item.type === 'TASK' && item.taskStatus && (
                        <div className="mt-2">
                          <Badge
                            variant={
                              item.taskStatus === 'COMPLETED' ? 'default' : 'outline'
                            }
                          >
                            {item.taskStatus}
                          </Badge>
                        </div>
                      )}

                      {item.type === 'HABIT' && item.habitStreak !== undefined && (
                        <div className="mt-2 text-sm text-orange-600 font-medium">
                          🔥 Sequência: {item.habitStreak} dias
                        </div>
                      )}

                      {item.type === 'EVENT' && item.eventType && (
                        <div className="mt-2">
                          <Badge variant="outline">{item.eventType}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Total no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{items.length}</div>
            <p className="text-sm text-gray-500">itens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {items.filter((i) => i.type === 'EVENT').length}
            </div>
            <p className="text-sm text-gray-500">compromissos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600">Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {items.filter((i) => i.type === 'TASK').length}
            </div>
            <p className="text-sm text-gray-500">com prazo</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Event Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleCreateEvent)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  {...form.register('title')}
                  placeholder="Nome do evento"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  {...form.register('description')}
                  placeholder="Detalhes do evento"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(value) => form.setValue('type', value as EventType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EventType.MEETING}>Reunião</SelectItem>
                    <SelectItem value={EventType.APPOINTMENT}>Compromisso</SelectItem>
                    <SelectItem value={EventType.REMINDER}>Lembrete</SelectItem>
                    <SelectItem value={EventType.DEADLINE}>Prazo</SelectItem>
                    <SelectItem value={EventType.PERSONAL}>Pessoal</SelectItem>
                    <SelectItem value={EventType.WORK}>Trabalho</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recurrence">Recorrência</Label>
                <Select
                  value={form.watch('recurrence')}
                  onValueChange={(value) => form.setValue('recurrence', value as EventRecurrence)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a recorrência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EventRecurrence.NONE}>Nenhuma</SelectItem>
                    <SelectItem value={EventRecurrence.DAILY}>Diária</SelectItem>
                    <SelectItem value={EventRecurrence.WEEKLY}>Semanal</SelectItem>
                    <SelectItem value={EventRecurrence.MONTHLY}>Mensal</SelectItem>
                    <SelectItem value={EventRecurrence.YEARLY}>Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Data/Hora de Início *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...form.register('startDate')}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">Data/Hora de Término</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...form.register('endDate')}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="location">Local</Label>
                <Input
                  id="location"
                  {...form.register('location')}
                  placeholder="Local do evento"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="color">Cor</Label>
                <Input
                  id="color"
                  type="color"
                  {...form.register('color')}
                  className="h-10 w-full"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  id="isAllDay"
                  type="checkbox"
                  {...form.register('isAllDay')}
                  className="h-4 w-4"
                />
                <Label htmlFor="isAllDay" className="cursor-pointer">
                  Evento de dia inteiro
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? 'Criando...' : 'Criar Evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
