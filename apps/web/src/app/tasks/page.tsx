'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  createdAt: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.items || []);
    } catch (error) {
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const createTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Digite um título para a tarefa');
      return;
    }

    setIsCreating(true);
    try {
      await api.post('/tasks', {
        title: newTaskTitle,
        status: 'TODO',
        priority: 'MEDIUM',
      });
      setNewTaskTitle('');
      toast.success('Tarefa criada com sucesso!');
      loadTasks();
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await api.put(`/tasks/${task.id}`, {
        ...task,
        status: newStatus,
      });
      toast.success(`Tarefa ${newStatus === 'COMPLETED' ? 'concluída' : 'reaberta'}!`);
      loadTasks();
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Tarefa deletada!');
      loadTasks();
    } catch (error) {
      toast.error('Erro ao deletar tarefa');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'A Fazer';
      case 'IN_PROGRESS':
        return 'Em Progresso';
      case 'COMPLETED':
        return 'Concluída';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
        <p className="text-gray-600 mt-1">Gerencie suas tarefas e atividades</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nova Tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite o título da tarefa..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createTask()}
            />
            <Button onClick={createTask} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-gray-500">Carregando tarefas...</p>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500">
              Nenhuma tarefa encontrada. Crie sua primeira tarefa acima!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className={cn(task.status === 'COMPLETED' && 'opacity-60')}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleTaskStatus(task)}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded border-2 transition-colors',
                      task.status === 'COMPLETED'
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 hover:border-green-600'
                    )}
                  >
                    {task.status === 'COMPLETED' && <Check className="h-4 w-4 text-white" />}
                  </button>

                  <div className="flex-1">
                    <h3
                      className={cn(
                        'font-medium',
                        task.status === 'COMPLETED' && 'line-through text-gray-500'
                      )}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span
                        className={cn('text-xs px-2 py-1 rounded', getPriorityColor(task.priority))}
                      >
                        {task.priority}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
