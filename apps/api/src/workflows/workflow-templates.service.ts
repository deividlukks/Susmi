import { Injectable } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  triggerConfig: any;
  actions: any[];
  conditions?: any[];
}

@Injectable()
export class WorkflowTemplatesService {
  constructor(private workflowsService: WorkflowsService) {}

  /**
   * Get all available workflow templates
   */
  getTemplates(): WorkflowTemplate[] {
    return [
      // Task Management Templates
      {
        id: 'auto-prioritize-urgent',
        name: 'Auto-priorizar Tarefas Urgentes',
        description: 'Quando uma tarefa com prazo próximo é criada, automaticamente marca como urgente',
        category: 'tasks',
        triggerType: 'event',
        triggerConfig: { eventType: 'task.created' },
        conditions: [
          {
            field: 'eventData.dueDate',
            operator: 'less_than',
            value: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        actions: [
          {
            type: 'send_notification',
            config: {
              message: 'Tarefa urgente criada: {{eventData.title}}',
              type: 'warning',
            },
          },
        ],
      },
      {
        id: 'daily-task-summary',
        name: 'Resumo Diário de Tarefas',
        description: 'Envia um resumo das tarefas do dia todas as manhãs às 8h',
        category: 'tasks',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 8 * * *' },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: 'Bom dia! Você tem {{taskCount}} tarefas para hoje.',
              type: 'info',
            },
          },
        ],
      },
      {
        id: 'overdue-reminder',
        name: 'Lembrete de Tarefas Atrasadas',
        description: 'Notifica sobre tarefas atrasadas toda manhã',
        category: 'tasks',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 9 * * *' },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: '⚠️ Você tem tarefas atrasadas que precisam de atenção!',
              type: 'warning',
            },
          },
        ],
      },

      // Habit Tracking Templates
      {
        id: 'habit-streak-alert',
        name: 'Alerta de Sequência de Hábitos',
        description: 'Notifica quando você está prestes a quebrar uma sequência de hábito',
        category: 'habits',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 20 * * *' },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: '🔥 Não quebre sua sequência! Registre seu hábito hoje.',
              type: 'info',
            },
          },
        ],
      },
      {
        id: 'weekly-habit-review',
        name: 'Revisão Semanal de Hábitos',
        description: 'Envia um resumo semanal do progresso dos hábitos toda segunda-feira',
        category: 'habits',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 9 * * 1' },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: '📊 Resumo semanal de hábitos disponível!',
              type: 'info',
            },
          },
        ],
      },

      // Calendar & Events Templates
      {
        id: 'meeting-preparation',
        name: 'Preparação para Reuniões',
        description: 'Cria uma tarefa de preparação 1 hora antes de cada reunião',
        category: 'calendar',
        triggerType: 'event',
        triggerConfig: { eventType: 'event.created' },
        conditions: [
          {
            field: 'eventData.type',
            operator: 'equals',
            value: 'MEETING',
          },
        ],
        actions: [
          {
            type: 'create_task',
            config: {
              title: 'Preparar para reunião: {{eventData.title}}',
              description: 'Revisar agenda e materiais',
              priority: 'HIGH',
            },
          },
        ],
      },
      {
        id: 'event-reminder',
        name: 'Lembrete de Eventos',
        description: 'Envia lembrete 30 minutos antes de qualquer evento',
        category: 'calendar',
        triggerType: 'schedule',
        triggerConfig: { schedule: '*/30 * * * *' },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: '📅 Evento em 30 minutos: {{event.title}}',
              type: 'info',
            },
          },
        ],
      },

      // Productivity Templates
      {
        id: 'focus-time-blocker',
        name: 'Bloqueio de Tempo de Foco',
        description: 'Cria blocos de tempo de foco diários das 9h às 11h',
        category: 'productivity',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 9 * * 1-5' },
        actions: [
          {
            type: 'create_task',
            config: {
              title: '🎯 Tempo de Foco - Deep Work',
              description: 'Período dedicado a trabalho profundo sem interrupções',
              priority: 'HIGH',
            },
          },
        ],
      },
      {
        id: 'end-of-day-review',
        name: 'Revisão de Fim de Dia',
        description: 'Lembra de revisar o dia e planejar o próximo às 18h',
        category: 'productivity',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 18 * * 1-5' },
        actions: [
          {
            type: 'send_notification',
            config: {
              message: '🌅 Hora de revisar seu dia e planejar amanhã!',
              type: 'info',
            },
          },
        ],
      },

      // Integration Templates
      {
        id: 'sync-google-calendar',
        name: 'Sincronizar Google Calendar',
        description: 'Sincroniza eventos do Google Calendar automaticamente',
        category: 'integrations',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 */2 * * *' },
        actions: [
          {
            type: 'http_request',
            config: {
              url: '/api/integrations/google/calendar/sync',
              method: 'POST',
            },
          },
        ],
      },
      {
        id: 'sync-todoist',
        name: 'Sincronizar Todoist',
        description: 'Sincroniza tarefas do Todoist a cada 4 horas',
        category: 'integrations',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 */4 * * *' },
        actions: [
          {
            type: 'http_request',
            config: {
              url: '/api/integrations/todoist/tasks/sync',
              method: 'POST',
            },
          },
        ],
      },

      // Agent Templates
      {
        id: 'morning-briefing',
        name: 'Briefing Matinal',
        description: 'Executa o agente de agenda para briefing matinal às 7h',
        category: 'agents',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 7 * * *' },
        actions: [
          {
            type: 'run_agent',
            config: {
              agent: 'agenda',
              action: 'morning_briefing',
            },
          },
        ],
      },
      {
        id: 'weekly-planning',
        name: 'Planejamento Semanal',
        description: 'Executa agente de planejamento toda segunda-feira',
        category: 'agents',
        triggerType: 'schedule',
        triggerConfig: { schedule: '0 8 * * 1' },
        actions: [
          {
            type: 'run_agent',
            config: {
              agent: 'agenda',
              action: 'weekly_planning',
            },
          },
        ],
      },
    ];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return this.getTemplates().filter((t) => t.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: string): WorkflowTemplate | undefined {
    return this.getTemplates().find((t) => t.id === id);
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(userId: string, templateId: string, customName?: string) {
    const template = this.getTemplateById(templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return this.workflowsService.createWorkflow({
      userId,
      name: customName || template.name,
      description: template.description,
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig,
      actions: template.actions,
      conditions: template.conditions,
      priority: 0,
    });
  }

  /**
   * Get template categories
   */
  getCategories(): string[] {
    const templates = this.getTemplates();
    const categories = new Set(templates.map((t) => t.category));
    return Array.from(categories);
  }
}
