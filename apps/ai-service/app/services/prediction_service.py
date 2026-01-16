from typing import List
from datetime import datetime, timedelta
from app.models.schemas import (
    TaskData,
    TaskCompletionPrediction,
    TaskPriority,
    TaskStatus,
)
import statistics


class PredictionService:
    """Serviço para fazer predições sobre conclusão de tarefas"""

    def predict_task_completion(
        self, tasks: List[TaskData], historical_data: dict = None
    ) -> List[TaskCompletionPrediction]:
        predictions = []

        pending_tasks = [
            t for t in tasks if t.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]
        ]

        # Calcular estatísticas históricas
        completed_tasks = [t for t in tasks if t.status == TaskStatus.COMPLETED]
        historical_stats = self._calculate_historical_stats(completed_tasks)

        for task in pending_tasks:
            prediction = self._predict_single_task(task, historical_stats)
            predictions.append(prediction)

        return predictions

    def _calculate_historical_stats(self, completed_tasks: List[TaskData]) -> dict:
        """Calcula estatísticas baseadas em tarefas concluídas"""
        if not completed_tasks:
            return {
                "avg_completion_time": 24,  # 24 horas padrão
                "by_priority": {},
            }

        # Tempo médio de conclusão
        completion_times = []
        for task in completed_tasks:
            if task.completedAt and task.createdAt:
                hours = (task.completedAt - task.createdAt).total_seconds() / 3600
                completion_times.append(hours)

        avg_completion_time = (
            statistics.mean(completion_times) if completion_times else 24
        )

        # Tempo médio por prioridade
        by_priority = {}
        for priority in TaskPriority:
            priority_tasks = [
                t
                for t in completed_tasks
                if t.priority == priority and t.completedAt and t.createdAt
            ]
            if priority_tasks:
                priority_times = [
                    (t.completedAt - t.createdAt).total_seconds() / 3600
                    for t in priority_tasks
                ]
                by_priority[priority.value] = statistics.mean(priority_times)
            else:
                by_priority[priority.value] = avg_completion_time

        return {
            "avg_completion_time": avg_completion_time,
            "by_priority": by_priority,
        }

    def _predict_single_task(
        self, task: TaskData, historical_stats: dict
    ) -> TaskCompletionPrediction:
        """Prediz quando uma tarefa será concluída"""
        now = datetime.now()

        # Usar tempo estimado se disponível, senão usar histórico
        if task.estimatedTime:
            estimated_hours = task.estimatedTime / 60
        else:
            estimated_hours = historical_stats["by_priority"].get(
                task.priority.value, historical_stats["avg_completion_time"]
            )

        # Ajustar baseado na prioridade
        priority_multipliers = {
            TaskPriority.URGENT: 0.7,  # Tarefas urgentes tendem a ser feitas mais rápido
            TaskPriority.HIGH: 0.85,
            TaskPriority.MEDIUM: 1.0,
            TaskPriority.LOW: 1.3,  # Tarefas de baixa prioridade tendem a demorar mais
        }

        multiplier = priority_multipliers.get(task.priority, 1.0)
        adjusted_hours = estimated_hours * multiplier

        # Calcular data prevista
        predicted_date = now + timedelta(hours=adjusted_hours)

        # Se há prazo definido, considerar isso
        if task.dueDate:
            # Se o prazo é antes da predição, usar o prazo como referência
            if task.dueDate < predicted_date:
                predicted_date = task.dueDate
                confidence = 0.6  # Menor confiança quando forçado pelo prazo
            else:
                confidence = 0.8
        else:
            confidence = 0.75

        # Ajustar confiança baseado em fatores
        factors = []

        if task.estimatedTime:
            factors.append("Tempo estimado fornecido")
            confidence += 0.1

        if task.priority == TaskPriority.URGENT:
            factors.append("Alta prioridade")
            confidence += 0.05

        if task.dueDate and task.dueDate < now + timedelta(days=2):
            factors.append("Prazo próximo")
            confidence += 0.05

        if not factors:
            factors.append("Baseado em dados históricos")

        # Garantir que confiança está entre 0 e 1
        confidence = min(confidence, 1.0)

        return TaskCompletionPrediction(
            taskId=task.id,
            predictedCompletionDate=predicted_date,
            confidence=confidence,
            estimatedDuration=int(adjusted_hours * 60),  # em minutos
            factors=factors,
        )
