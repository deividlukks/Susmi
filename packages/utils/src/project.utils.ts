import { Project, ProjectCard, ProjectColumn } from '@susmi/types';

export interface ProjectProgress {
  totalCards: number;
  completedCards: number;
  progressPercentage: number;
}

/**
 * Calculate project progress based on completed cards
 * Assumes the last column is the "completed" column
 */
export function calculateProjectProgress(
  project: Project,
  completedColumnIds: string[] = [],
): ProjectProgress {
  if (!project.columns || project.columns.length === 0) {
    return { totalCards: 0, completedCards: 0, progressPercentage: 0 };
  }

  let totalCards = 0;
  let completedCards = 0;

  // Count all cards across all columns
  for (const column of project.columns) {
    const cardsInColumn = column.cards?.length || 0;
    totalCards += cardsInColumn;

    // If this column is marked as "completed" or is the last column
    if (
      completedColumnIds.includes(column.id) ||
      (completedColumnIds.length === 0 &&
        column.position === project.columns.length - 1)
    ) {
      completedCards += cardsInColumn;
    }
  }

  const progressPercentage =
    totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  return {
    totalCards,
    completedCards,
    progressPercentage,
  };
}

/**
 * Reorder cards when moving within a column or between columns
 */
export function reorderCards<T extends { position: number }>(
  items: T[],
  sourceIndex: number,
  destinationIndex: number,
): T[] {
  const result = Array.from(items);
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(destinationIndex, 0, removed);

  // Update positions
  return result.map((item, index) => ({
    ...item,
    position: index,
  }));
}

/**
 * Reorder cards between different columns
 */
export function moveCardBetweenColumns<T extends { position: number }>(
  sourceItems: T[],
  destinationItems: T[],
  sourceIndex: number,
  destinationIndex: number,
): { source: T[]; destination: T[] } {
  const sourceClone = Array.from(sourceItems);
  const destClone = Array.from(destinationItems);
  const [removed] = sourceClone.splice(sourceIndex, 1);

  destClone.splice(destinationIndex, 0, removed);

  return {
    source: sourceClone.map((item, index) => ({
      ...item,
      position: index,
    })),
    destination: destClone.map((item, index) => ({
      ...item,
      position: index,
    })),
  };
}

/**
 * Get default Kanban columns for a new project
 */
export function getDefaultProjectColumns(): Omit<
  ProjectColumn,
  'id' | 'projectId' | 'createdAt' | 'updatedAt'
>[] {
  return [
    {
      title: 'To Do',
      position: 0,
      color: '#94a3b8',
      limit: undefined,
      cards: [],
    },
    {
      title: 'In Progress',
      position: 1,
      color: '#3b82f6',
      limit: 5,
      cards: [],
    },
    {
      title: 'Review',
      position: 2,
      color: '#f59e0b',
      limit: 3,
      cards: [],
    },
    {
      title: 'Done',
      position: 3,
      color: '#10b981',
      limit: undefined,
      cards: [],
    },
  ];
}

/**
 * Calculate total estimated hours for a project
 */
export function calculateProjectHours(
  project: Project,
): { estimated: number; actual: number } {
  if (!project.columns || project.columns.length === 0) {
    return { estimated: 0, actual: 0 };
  }

  let estimated = 0;
  let actual = 0;

  for (const column of project.columns) {
    if (column.cards) {
      for (const card of column.cards) {
        estimated += card.estimatedHours || 0;
        actual += card.actualHours || 0;
      }
    }
  }

  return { estimated, actual };
}

/**
 * Check if a column has reached its WIP (Work In Progress) limit
 */
export function isColumnAtLimit(column: ProjectColumn): boolean {
  if (!column.limit) return false;
  const cardCount = column.cards?.length || 0;
  return cardCount >= column.limit;
}

/**
 * Get cards by priority across all columns
 */
export function getCardsByPriority(
  project: Project,
): Record<string, ProjectCard[]> {
  const cardsByPriority: Record<string, ProjectCard[]> = {
    URGENT: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };

  if (!project.columns) return cardsByPriority;

  for (const column of project.columns) {
    if (column.cards) {
      for (const card of column.cards) {
        cardsByPriority[card.priority].push(card);
      }
    }
  }

  return cardsByPriority;
}

/**
 * Get overdue cards (cards with dueDate in the past)
 */
export function getOverdueCards(project: Project): ProjectCard[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const overdueCards: ProjectCard[] = [];

  if (!project.columns) return overdueCards;

  for (const column of project.columns) {
    if (column.cards) {
      for (const card of column.cards) {
        if (card.dueDate) {
          const dueDate = new Date(card.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < now) {
            overdueCards.push(card);
          }
        }
      }
    }
  }

  return overdueCards;
}

/**
 * Validate card move (check WIP limits)
 */
export function canMoveCard(
  targetColumn: ProjectColumn,
  excludeCardId?: string,
): { canMove: boolean; reason?: string } {
  if (!targetColumn.limit) {
    return { canMove: true };
  }

  let currentCount = targetColumn.cards?.length || 0;

  // If we're moving a card that's already in this column, don't count it
  if (
    excludeCardId &&
    targetColumn.cards?.some((card) => card.id === excludeCardId)
  ) {
    currentCount--;
  }

  if (currentCount >= targetColumn.limit) {
    return {
      canMove: false,
      reason: `Column "${targetColumn.title}" has reached its WIP limit of ${targetColumn.limit}`,
    };
  }

  return { canMove: true };
}
