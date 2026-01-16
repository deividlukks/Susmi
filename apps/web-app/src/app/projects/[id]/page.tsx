'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Plus, GripVertical, MoreVertical, Calendar, User, Pencil, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { projectsService } from '@/services/projects.service';
import { Project, ProjectCard, ProjectColumn, TaskPriority } from '@susmi/types';
import { Button } from '@susmi/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@susmi/ui';
import { Badge } from '@susmi/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@susmi/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Textarea } from '@susmi/ui';

const columnSchema = z.object({
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres'),
  color: z.string().optional(),
  limit: z.number().optional(),
});

type ColumnForm = z.infer<typeof columnSchema>;

const cardSchema = z.object({
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.number().optional(),
});

type CardForm = z.infer<typeof cardSchema>;

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

function KanbanCard({ card, onClick }: { card: ProjectCard; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-sm mb-1">{card.title}</h4>
          {card.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{card.description}</p>
          )}
        </div>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={priorityColors[card.priority]}>
          {priorityLabels[card.priority]}
        </Badge>

        {card.dueDate && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            {format(new Date(card.dueDate), 'dd/MM', { locale: ptBR })}
          </div>
        )}

        {card.assignee && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <User className="h-3 w-3" />
            {card.assignee.name.split(' ')[0]}
          </div>
        )}

        {card.tags && card.tags.length > 0 && (
          <div className="flex gap-1">
            {card.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectBoardPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [activeCard, setActiveCard] = useState<ProjectCard | null>(null);
  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<ProjectColumn | null>(null);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
  const [isEditCardModalOpen, setIsEditCardModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ProjectCard | null>(null);
  const [selectedColumnForCard, setSelectedColumnForCard] = useState<string | null>(null);

  const columnForm = useForm<ColumnForm>({
    resolver: zodResolver(columnSchema),
    defaultValues: {
      title: '',
      color: '#6366f1',
      limit: undefined,
    },
  });

  const cardForm = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      dueDate: '',
      tags: [],
      assigneeId: '',
      estimatedHours: undefined,
    },
  });

  // Queries
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsService.getProject(projectId),
  });

  // Mutations
  const moveCardMutation = useMutation({
    mutationFn: projectsService.moveCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Card movido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao mover card');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: (data: ColumnForm) => {
      const position = (project?.columns?.length || 0);
      return projectsService.createColumn(projectId, { ...data, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Coluna criada com sucesso!');
      setIsCreateColumnModalOpen(false);
      columnForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar coluna');
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ColumnForm }) =>
      projectsService.updateColumn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Coluna atualizada com sucesso!');
      setIsEditColumnModalOpen(false);
      setSelectedColumn(null);
      columnForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar coluna');
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: projectsService.deleteColumn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Coluna deletada com sucesso!');
      setDeleteColumnId(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar coluna');
    },
  });

  const handleCreateColumn = (data: ColumnForm) => {
    createColumnMutation.mutate(data);
  };

  const handleEditColumn = (data: ColumnForm) => {
    if (selectedColumn) {
      updateColumnMutation.mutate({ id: selectedColumn.id, data });
    }
  };

  const openEditColumnModal = (column: ProjectColumn) => {
    setSelectedColumn(column);
    columnForm.reset({
      title: column.title,
      color: column.color || '#6366f1',
      limit: column.limit || undefined,
    });
    setIsEditColumnModalOpen(true);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta coluna? Ela deve estar vazia.')) {
      deleteColumnMutation.mutate(columnId);
    }
  };

  // Card Mutations
  const createCardMutation = useMutation({
    mutationFn: (data: CardForm & { columnId: string }) => {
      const position = project?.columns?.find((c) => c.id === data.columnId)?.cards?.length || 0;
      return projectsService.createCard(projectId, {
        ...data,
        position,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Card criado com sucesso!');
      setIsCreateCardModalOpen(false);
      cardForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar card');
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CardForm }) =>
      projectsService.updateCard(id, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Card atualizado com sucesso!');
      setIsEditCardModalOpen(false);
      setSelectedCard(null);
      cardForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar card');
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: projectsService.deleteCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Card deletado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao deletar card');
    },
  });

  const handleCreateCard = (data: CardForm) => {
    if (selectedColumnForCard) {
      createCardMutation.mutate({ ...data, columnId: selectedColumnForCard });
    }
  };

  const handleEditCard = (data: CardForm) => {
    if (selectedCard) {
      updateCardMutation.mutate({ id: selectedCard.id, data });
    }
  };

  const openCreateCardModal = (columnId: string) => {
    setSelectedColumnForCard(columnId);
    cardForm.reset();
    setIsCreateCardModalOpen(true);
  };

  const openEditCardModal = (card: ProjectCard) => {
    setSelectedCard(card);
    cardForm.reset({
      title: card.title,
      description: card.description || '',
      priority: card.priority,
      dueDate: card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 16) : '',
      tags: card.tags || [],
      assigneeId: card.assigneeId || '',
      estimatedHours: card.estimatedHours || undefined,
    });
    setIsEditCardModalOpen(true);
  };

  const handleDeleteCard = (cardId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este card?')) {
      deleteCardMutation.mutate(cardId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = project?.columns
      ?.flatMap((col) => col.cards || [])
      .find((c) => c?.id === active.id);

    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !project) return;

    const activeCardId = active.id as string;
    const overColumnId = over.id as string;

    // Find the card being dragged
    const activeColumn = project.columns?.find((col) =>
      col.cards?.some((card) => card?.id === activeCardId)
    );
    const activeCard = activeColumn?.cards?.find((card) => card?.id === activeCardId);

    if (!activeCard) return;

    // Find target column
    const targetColumn = project.columns?.find((col) => col.id === overColumnId);

    if (!targetColumn) return;

    // If dropping in the same column
    if (activeColumn?.id === targetColumn.id) {
      return; // No need to update server if position doesn't change
    }

    // Move card to new column
    const targetPosition = targetColumn.cards?.length || 0;

    moveCardMutation.mutate({
      cardId: activeCardId,
      targetColumnId: targetColumn.id,
      targetPosition,
    });
  };

  if (projectLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Projeto não encontrado</p>
      </div>
    );
  }

  const columns = project.columns || [];
  const columnIds = columns.map((col) => col.id);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-3 h-12 rounded"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-500 mt-1">{project.description || 'Sem descrição'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex -space-x-2">
            {project.members?.slice(0, 5).map((member) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                title={member.user?.name}
              >
                {member.user?.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {project.members && project.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center text-xs font-medium border-2 border-white">
                +{project.members.length - 5}
              </div>
            )}
          </div>

          {project.progress !== undefined && (
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{project.progress.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {columns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhuma coluna criada ainda</p>
            <Button onClick={() => setIsCreateColumnModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Coluna
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {column.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: column.color }}
                        />
                      )}
                      <h3 className="font-semibold text-gray-900">{column.title}</h3>
                      <span className="text-sm text-gray-500">
                        {column.cards?.length || 0}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditColumnModal(column)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar Coluna
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteColumn(column.id)}
                          className="text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Deletar Coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <SortableContext
                    items={column.cards?.map((c) => c.id) || []}
                    strategy={verticalListSortingStrategy}
                    id={column.id}
                  >
                    <div className="space-y-2 min-h-[200px]">
                      {column.cards?.map((card) => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          onClick={() => openEditCardModal(card)}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-gray-600 hover:bg-gray-200"
                    onClick={() => openCreateCardModal(column.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Card
                  </Button>
                </div>
              ))}

            {/* Add Column Button */}
            <div className="flex-shrink-0 w-80">
              <Button
                variant="outline"
                className="w-full h-full min-h-[200px] border-dashed border-2 hover:bg-gray-50"
                onClick={() => setIsCreateColumnModalOpen(true)}
              >
                <Plus className="mr-2 h-5 w-5" />
                Nova Coluna
              </Button>
            </div>
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-lg rotate-3">
                <h4 className="font-medium text-sm">{activeCard.title}</h4>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Milestones */}
      {project.milestones && project.milestones.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Marcos do Projeto</CardTitle>
              <CardDescription>Acompanhe os principais marcos do projeto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{milestone.title}</h4>
                      {milestone.description && (
                        <p className="text-sm text-gray-600">{milestone.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge>{milestone.status}</Badge>
                      {milestone.dueDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(milestone.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Column Modal */}
      <Dialog open={isCreateColumnModalOpen} onOpenChange={setIsCreateColumnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Coluna</DialogTitle>
          </DialogHeader>

          <form onSubmit={columnForm.handleSubmit(handleCreateColumn)} className="space-y-4">
            <div>
              <Label htmlFor="create-title">Título *</Label>
              <Input
                id="create-title"
                {...columnForm.register('title')}
                placeholder="Nome da coluna"
              />
              {columnForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {columnForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="create-color">Cor</Label>
              <Input
                id="create-color"
                type="color"
                {...columnForm.register('color')}
                className="h-10 w-full"
              />
            </div>

            <div>
              <Label htmlFor="create-limit">Limite de Cards</Label>
              <Input
                id="create-limit"
                type="number"
                {...columnForm.register('limit', { valueAsNumber: true })}
                placeholder="Opcional"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateColumnModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createColumnMutation.isPending}>
                {createColumnMutation.isPending ? 'Criando...' : 'Criar Coluna'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Column Modal */}
      <Dialog open={isEditColumnModalOpen} onOpenChange={setIsEditColumnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
          </DialogHeader>

          <form onSubmit={columnForm.handleSubmit(handleEditColumn)} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                {...columnForm.register('title')}
                placeholder="Nome da coluna"
              />
              {columnForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {columnForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-color">Cor</Label>
              <Input
                id="edit-color"
                type="color"
                {...columnForm.register('color')}
                className="h-10 w-full"
              />
            </div>

            <div>
              <Label htmlFor="edit-limit">Limite de Cards</Label>
              <Input
                id="edit-limit"
                type="number"
                {...columnForm.register('limit', { valueAsNumber: true })}
                placeholder="Opcional"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditColumnModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateColumnMutation.isPending}>
                {updateColumnMutation.isPending ? 'Atualizando...' : 'Atualizar Coluna'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Card Modal */}
      <Dialog open={isCreateCardModalOpen} onOpenChange={setIsCreateCardModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Card</DialogTitle>
          </DialogHeader>

          <form onSubmit={cardForm.handleSubmit(handleCreateCard)} className="space-y-4">
            <div>
              <Label htmlFor="card-title">Título *</Label>
              <Input
                id="card-title"
                {...cardForm.register('title')}
                placeholder="Nome do card"
              />
              {cardForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {cardForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="card-description">Descrição</Label>
              <Textarea
                id="card-description"
                {...cardForm.register('description')}
                placeholder="Detalhes do card"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="card-priority">Prioridade</Label>
                <Select
                  value={cardForm.watch('priority')}
                  onValueChange={(value) => cardForm.setValue('priority', value as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskPriority.LOW}>Baixa</SelectItem>
                    <SelectItem value={TaskPriority.MEDIUM}>Média</SelectItem>
                    <SelectItem value={TaskPriority.HIGH}>Alta</SelectItem>
                    <SelectItem value={TaskPriority.URGENT}>Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="card-dueDate">Data de Vencimento</Label>
                <Input
                  id="card-dueDate"
                  type="datetime-local"
                  {...cardForm.register('dueDate')}
                />
              </div>

              <div>
                <Label htmlFor="card-estimatedHours">Horas Estimadas</Label>
                <Input
                  id="card-estimatedHours"
                  type="number"
                  step="0.5"
                  {...cardForm.register('estimatedHours', { valueAsNumber: true })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateCardModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createCardMutation.isPending}>
                {createCardMutation.isPending ? 'Criando...' : 'Criar Card'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Card Modal */}
      <Dialog open={isEditCardModalOpen} onOpenChange={setIsEditCardModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Editar Card</DialogTitle>
              {selectedCard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCard(selectedCard.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={cardForm.handleSubmit(handleEditCard)} className="space-y-4">
            <div>
              <Label htmlFor="edit-card-title">Título *</Label>
              <Input
                id="edit-card-title"
                {...cardForm.register('title')}
                placeholder="Nome do card"
              />
              {cardForm.formState.errors.title && (
                <p className="text-sm text-red-500 mt-1">
                  {cardForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-card-description">Descrição</Label>
              <Textarea
                id="edit-card-description"
                {...cardForm.register('description')}
                placeholder="Detalhes do card"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-card-priority">Prioridade</Label>
                <Select
                  value={cardForm.watch('priority')}
                  onValueChange={(value) => cardForm.setValue('priority', value as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskPriority.LOW}>Baixa</SelectItem>
                    <SelectItem value={TaskPriority.MEDIUM}>Média</SelectItem>
                    <SelectItem value={TaskPriority.HIGH}>Alta</SelectItem>
                    <SelectItem value={TaskPriority.URGENT}>Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-card-dueDate">Data de Vencimento</Label>
                <Input
                  id="edit-card-dueDate"
                  type="datetime-local"
                  {...cardForm.register('dueDate')}
                />
              </div>

              <div>
                <Label htmlFor="edit-card-estimatedHours">Horas Estimadas</Label>
                <Input
                  id="edit-card-estimatedHours"
                  type="number"
                  step="0.5"
                  {...cardForm.register('estimatedHours', { valueAsNumber: true })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditCardModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateCardMutation.isPending}>
                {updateCardMutation.isPending ? 'Atualizando...' : 'Atualizar Card'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
