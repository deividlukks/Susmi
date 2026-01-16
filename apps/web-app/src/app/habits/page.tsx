'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, CheckCircle2, Target, Flame } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { habitsService } from '@/services/habits.service';
import {
  Habit,
  CreateHabitDto,
  UpdateHabitDto,
  HabitFrequency,
  HabitCheckInDto,
} from '@susmi/types';
import { Button } from '@susmi/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { Input } from '@susmi/ui';
import { Label } from '@susmi/ui';
import { Badge } from '@susmi/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@susmi/ui';

const createHabitSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  frequency: z.nativeEnum(HabitFrequency),
  targetCount: z.number().min(1).optional(),
  color: z.string().default('#3b82f6'),
});

const updateHabitSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres').optional(),
  description: z.string().optional(),
  frequency: z.nativeEnum(HabitFrequency).optional(),
  targetCount: z.number().min(1).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

type CreateHabitForm = z.infer<typeof createHabitSchema>;
type UpdateHabitForm = z.infer<typeof updateHabitSchema>;

const frequencyLabels: Record<HabitFrequency, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  CUSTOM: 'Personalizado',
};

const colorOptions = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

export default function HabitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  // Queries
  const { data: habitsData, isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: () => habitsService.getHabits({ isActive: true }),
  });

  // Forms
  const createForm = useForm<CreateHabitForm>({
    resolver: zodResolver(createHabitSchema),
    defaultValues: {
      title: '',
      description: '',
      frequency: HabitFrequency.DAILY,
      color: '#3b82f6',
    },
  });

  const editForm = useForm<UpdateHabitForm>({
    resolver: zodResolver(updateHabitSchema),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateHabitDto) => habitsService.createHabit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Hábito criado com sucesso!');
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar hábito');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHabitDto }) =>
      habitsService.updateHabit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Hábito atualizado com sucesso!');
      setIsEditModalOpen(false);
      setSelectedHabit(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar hábito');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => habitsService.deleteHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Hábito excluído com sucesso!');
      setIsDeleteModalOpen(false);
      setSelectedHabit(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao excluir hábito');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (data: HabitCheckInDto) => habitsService.checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Check-in realizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao fazer check-in');
    },
  });

  // Handlers
  const handleCreate = (data: CreateHabitForm) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: UpdateHabitForm) => {
    if (!selectedHabit) return;
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined)
    ) as UpdateHabitDto;
    updateMutation.mutate({ id: selectedHabit.id, data: cleanData });
  };

  const handleDelete = () => {
    if (!selectedHabit) return;
    deleteMutation.mutate(selectedHabit.id);
  };

  const handleCheckIn = (habitId: string) => {
    checkInMutation.mutate({
      habitId,
      count: 1,
      date: new Date(),
    });
  };

  const openEditModal = (habit: Habit) => {
    setSelectedHabit(habit);
    editForm.reset({
      title: habit.title,
      description: habit.description || '',
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      color: habit.color,
      isActive: habit.isActive,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (habit: Habit) => {
    setSelectedHabit(habit);
    setIsDeleteModalOpen(true);
  };

  const habits = habitsData?.items || [];
  const totalHabits = habits.length;
  const activeHabits = habits.filter((h) => h.isActive).length;
  const totalStreak = habits.reduce((sum, h) => sum + (h.currentStreak || 0), 0);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hábitos</h1>
          <p className="text-gray-500 mt-1">Acompanhe e mantenha seus hábitos diários</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Hábito
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Hábitos</CardDescription>
            <CardTitle className="text-3xl">{totalHabits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Hábitos Ativos</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeHabits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Sequências</CardDescription>
            <CardTitle className="text-3xl text-orange-600 flex items-center gap-2">
              <Flame className="h-8 w-8" />
              {totalStreak}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Habits Grid */}
      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : habits.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum hábito encontrado</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Hábito
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {habits.map((habit) => (
            <Card
              key={habit.id}
              className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/habits/${habit.id}`)}
            >
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: habit.color }}
              />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{habit.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {habit.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{frequencyLabels[habit.frequency]}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-2xl font-bold text-orange-600">
                        <Flame className="h-6 w-6" />
                        {habit.currentStreak || 0}
                      </div>
                      <p className="text-xs text-gray-500">Sequência</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {habit.totalCheckIns || 0}
                      </div>
                      <p className="text-xs text-gray-500">Check-ins</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    className="flex-1"
                    onClick={() => handleCheckIn(habit.id)}
                    disabled={checkInMutation.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Check-in
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditModal(habit)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openDeleteModal(habit)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Habit Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Hábito</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para criar um novo hábito.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div>
              <Label htmlFor="create-title">Título</Label>
              <Input
                id="create-title"
                {...createForm.register('title')}
                placeholder="Ex: Meditar, Ler, Exercitar..."
              />
              {createForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {createForm.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-description">Descrição (opcional)</Label>
              <Input
                id="create-description"
                {...createForm.register('description')}
                placeholder="Descreva seu hábito..."
              />
            </div>
            <div>
              <Label htmlFor="create-frequency">Frequência</Label>
              <select
                id="create-frequency"
                {...createForm.register('frequency')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value={HabitFrequency.DAILY}>Diário</option>
                <option value={HabitFrequency.WEEKLY}>Semanal</option>
                <option value={HabitFrequency.MONTHLY}>Mensal</option>
                <option value={HabitFrequency.CUSTOM}>Personalizado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="create-color">Cor</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    onClick={() => createForm.setValue('color', color.value)}
                    title={color.label}
                  />
                ))}
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Hábito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Habit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Hábito</DialogTitle>
            <DialogDescription>Atualize os dados do hábito.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título</Label>
              <Input id="edit-title" {...editForm.register('title')} />
              {editForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {editForm.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Input id="edit-description" {...editForm.register('description')} />
            </div>
            <div>
              <Label htmlFor="edit-frequency">Frequência</Label>
              <select
                id="edit-frequency"
                {...editForm.register('frequency')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value={HabitFrequency.DAILY}>Diário</option>
                <option value={HabitFrequency.WEEKLY}>Semanal</option>
                <option value={HabitFrequency.MONTHLY}>Mensal</option>
                <option value={HabitFrequency.CUSTOM}>Personalizado</option>
              </select>
            </div>
            <div>
              <Label htmlFor="edit-color">Cor</Label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.value }}
                    onClick={() => editForm.setValue('color', color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o hábito <strong>{selectedHabit?.title}</strong>?
              Todos os check-ins serão perdidos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Hábito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
