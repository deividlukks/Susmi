'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, FolderKanban, Pencil, Trash2, Users, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { projectsService } from '@/services/projects.service';
import {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectStatus,
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

const createProjectSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  color: z.string().default('#3b82f6'),
});

const updateProjectSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres').optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  color: z.string().optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;
type UpdateProjectForm = z.infer<typeof updateProjectSchema>;

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: 'Planejamento',
  ACTIVE: 'Ativo',
  ON_HOLD: 'Pausado',
  COMPLETED: 'Concluído',
  ARCHIVED: 'Arquivado',
};

const statusColors: Record<ProjectStatus, string> = {
  PLANNING: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  ARCHIVED: 'bg-gray-300 text-gray-600',
};

const colorOptions = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Laranja' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Queries
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsService.getProjects({ isArchived: false }),
  });

  // Forms
  const createForm = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      color: '#3b82f6',
    },
  });

  const editForm = useForm<UpdateProjectForm>({
    resolver: zodResolver(updateProjectSchema),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectDto) => projectsService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto criado com sucesso!');
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar projeto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectDto }) =>
      projectsService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto atualizado com sucesso!');
      setIsEditModalOpen(false);
      setSelectedProject(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao atualizar projeto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projeto excluído com sucesso!');
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao excluir projeto');
    },
  });

  // Handlers
  const handleCreate = (data: CreateProjectForm) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: UpdateProjectForm) => {
    if (!selectedProject) return;
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined)
    ) as UpdateProjectDto;
    updateMutation.mutate({ id: selectedProject.id, data: cleanData });
  };

  const handleDelete = () => {
    if (!selectedProject) return;
    deleteMutation.mutate(selectedProject.id);
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    editForm.reset({
      title: project.title,
      description: project.description || '',
      status: project.status,
      color: project.color,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const projects = projectsData?.items || [];
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-500 mt-1">Gerencie seus projetos e acompanhe o progresso</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Projetos</CardDescription>
            <CardTitle className="text-3xl">{totalProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Projetos Ativos</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Concluídos</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{completedProjects}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhum projeto encontrado</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: project.color }}
              />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{project.members?.length || 0} membros</span>
                  </div>
                  {project.endDate && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(project.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {project.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progresso</span>
                      <span>{project.progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    className="flex-1"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <FolderKanban className="mr-2 h-4 w-4" />
                    Abrir Board
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openEditModal(project)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => openDeleteModal(project)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Projeto</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para criar um novo projeto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div>
              <Label htmlFor="create-title">Título</Label>
              <Input
                id="create-title"
                {...createForm.register('title')}
                placeholder="Nome do projeto..."
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
                placeholder="Descreva seu projeto..."
              />
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
                {createMutation.isPending ? 'Criando...' : 'Criar Projeto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>Atualize os dados do projeto.</DialogDescription>
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
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                {...editForm.register('status')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="PLANNING">Planejamento</option>
                <option value="ACTIVE">Ativo</option>
                <option value="ON_HOLD">Pausado</option>
                <option value="COMPLETED">Concluído</option>
                <option value="ARCHIVED">Arquivado</option>
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
              Tem certeza que deseja excluir o projeto <strong>{selectedProject?.title}</strong>?
              Todos os dados, colunas, cards e membros serão perdidos. Esta ação não pode ser
              desfeita.
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
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
