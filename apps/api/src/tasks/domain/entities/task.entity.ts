import { TaskStatus, TaskPriority } from '@susmi/shared';

/**
 * Task Domain Entity
 *
 * Encapsula lógica de negócio da tarefa seguindo DDD.
 * APLICA SRP: Lógica de negócio está na entidade, não no service.
 */
export class TaskEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    private title: string,
    private description: string | null,
    private status: TaskStatus,
    private priority: TaskPriority,
    private dueDate: Date | null,
    private completedAt: Date | null,
    private parentId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  // Domain Behaviors - Lógica de negócio encapsulada

  /**
   * Completa a tarefa
   * @throws Error se já estiver completa
   */
  complete(): void {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Tarefa já está completa');
    }
    this.status = TaskStatus.COMPLETED;
    this.completedAt = new Date();
  }

  /**
   * Reabre tarefa completa
   * @throws Error se não estiver completa
   */
  reopen(): void {
    if (this.status !== TaskStatus.COMPLETED) {
      throw new Error('Apenas tarefas completas podem ser reabertas');
    }
    this.status = TaskStatus.PENDING;
    this.completedAt = null;
  }

  /**
   * Alterna status da tarefa (completa <-> pendente)
   */
  toggleStatus(): void {
    if (this.status === TaskStatus.COMPLETED) {
      this.reopen();
    } else {
      this.complete();
    }
  }

  /**
   * Atualiza título da tarefa
   * @throws Error se título for vazio
   */
  updateTitle(newTitle: string): void {
    if (!newTitle || newTitle.trim().length === 0) {
      throw new Error('Título não pode ser vazio');
    }
    this.title = newTitle.trim();
  }

  /**
   * Atualiza descrição da tarefa
   */
  updateDescription(newDescription: string | null): void {
    this.description = newDescription ? newDescription.trim() : null;
  }

  /**
   * Atualiza prioridade da tarefa
   */
  updatePriority(newPriority: TaskPriority): void {
    this.priority = newPriority;
  }

  /**
   * Atualiza data de vencimento
   */
  updateDueDate(newDueDate: Date | null): void {
    this.dueDate = newDueDate;
  }

  /**
   * Marca tarefa como em progresso
   */
  startProgress(): void {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Tarefa completa não pode ser iniciada');
    }
    this.status = TaskStatus.IN_PROGRESS;
  }

  /**
   * Cancela a tarefa
   */
  cancel(): void {
    if (this.status === TaskStatus.COMPLETED) {
      throw new Error('Tarefa completa não pode ser cancelada');
    }
    this.status = TaskStatus.CANCELLED;
  }

  /**
   * Verifica se tarefa está atrasada
   */
  isOverdue(): boolean {
    if (!this.dueDate || this.status === TaskStatus.COMPLETED) {
      return false;
    }
    return this.dueDate < new Date();
  }

  /**
   * Verifica se é uma subtarefa
   */
  isSubtask(): boolean {
    return this.parentId !== null;
  }

  /**
   * Verifica se pode ser deletada
   */
  canBeDeleted(): boolean {
    // Regra de negócio: tarefas em progresso precisam ser canceladas antes
    return this.status !== TaskStatus.IN_PROGRESS;
  }

  // Getters - Acesso controlado aos dados privados

  getTitle(): string {
    return this.title;
  }

  getDescription(): string | null {
    return this.description;
  }

  getStatus(): TaskStatus {
    return this.status;
  }

  getPriority(): TaskPriority {
    return this.priority;
  }

  getDueDate(): Date | null {
    return this.dueDate;
  }

  getCompletedAt(): Date | null {
    return this.completedAt;
  }

  getParentId(): string | null {
    return this.parentId;
  }

  /**
   * Converte entidade para objeto plano (para persistência)
   */
  toPlainObject() {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      dueDate: this.dueDate,
      completedAt: this.completedAt,
      parentId: this.parentId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
