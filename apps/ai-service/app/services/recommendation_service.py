from typing import List
from datetime import datetime, timedelta
from app.models.schemas import (
    TaskData,
    EventData,
    Recommendation,
    TaskStatus,
    TaskPriority,
)


class RecommendationService:
    """Serviço para gerar recomendações inteligentes baseadas em dados do usuário"""

    def generate_recommendations(
        self, tasks: List[TaskData], events: List[EventData]
    ) -> List[Recommendation]:
        recommendations = []

        # Analisar tarefas atrasadas
        overdue_recommendations = self._analyze_overdue_tasks(tasks)
        recommendations.extend(overdue_recommendations)

        # Analisar carga de trabalho
        workload_recommendations = self._analyze_workload(tasks, events)
        recommendations.extend(workload_recommendations)

        # Analisar prioridades
        priority_recommendations = self._analyze_priorities(tasks)
        recommendations.extend(priority_recommendations)

        # Sugerir agrupamento de tarefas
        grouping_recommendations = self._suggest_task_grouping(tasks)
        recommendations.extend(grouping_recommendations)

        # Sugerir pausas
        break_recommendations = self._suggest_breaks(tasks, events)
        recommendations.extend(break_recommendations)

        return recommendations

    def _analyze_overdue_tasks(self, tasks: List[TaskData]) -> List[Recommendation]:
        recommendations = []
        now = datetime.now()

        overdue_tasks = [
            t
            for t in tasks
            if t.dueDate
            and t.dueDate < now
            and t.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]
        ]

        if len(overdue_tasks) > 0:
            recommendations.append(
                Recommendation(
                    type="overdue_alert",
                    title="Tarefas Atrasadas",
                    description=f"Você tem {len(overdue_tasks)} tarefa(s) atrasada(s). Considere repriorizá-las ou ajustar os prazos.",
                    priority="HIGH",
                    actionable=True,
                    metadata={"count": len(overdue_tasks), "tasks": [t.id for t in overdue_tasks]},
                )
            )

        return recommendations

    def _analyze_workload(
        self, tasks: List[TaskData], events: List[EventData]
    ) -> List[Recommendation]:
        recommendations = []
        now = datetime.now()
        next_week = now + timedelta(days=7)

        # Contar tarefas pendentes para próxima semana
        upcoming_tasks = [
            t
            for t in tasks
            if t.dueDate
            and now <= t.dueDate <= next_week
            and t.status == TaskStatus.TODO
        ]

        # Contar eventos para próxima semana
        upcoming_events = [
            e for e in events if now <= e.startDate <= next_week
        ]

        total_workload = len(upcoming_tasks) + len(upcoming_events)

        if total_workload > 15:
            recommendations.append(
                Recommendation(
                    type="workload_warning",
                    title="Carga de Trabalho Alta",
                    description=f"Você tem {len(upcoming_tasks)} tarefas e {len(upcoming_events)} eventos na próxima semana. Considere delegar ou reagendar algumas atividades.",
                    priority="MEDIUM",
                    actionable=True,
                    metadata={
                        "tasks_count": len(upcoming_tasks),
                        "events_count": len(upcoming_events),
                    },
                )
            )
        elif total_workload < 3:
            recommendations.append(
                Recommendation(
                    type="workload_low",
                    title="Tempo Disponível",
                    description="Você tem capacidade extra na próxima semana. Ótimo momento para planejar tarefas de longo prazo!",
                    priority="LOW",
                    actionable=False,
                    metadata={"available_capacity": True},
                )
            )

        return recommendations

    def _analyze_priorities(self, tasks: List[TaskData]) -> List[Recommendation]:
        recommendations = []

        pending_tasks = [
            t for t in tasks if t.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]
        ]

        urgent_tasks = [t for t in pending_tasks if t.priority == TaskPriority.URGENT]
        high_tasks = [t for t in pending_tasks if t.priority == TaskPriority.HIGH]

        if len(urgent_tasks) > 5:
            recommendations.append(
                Recommendation(
                    type="priority_overload",
                    title="Muitas Tarefas Urgentes",
                    description=f"Você tem {len(urgent_tasks)} tarefas marcadas como urgentes. Reavalie se todas realmente precisam dessa prioridade.",
                    priority="MEDIUM",
                    actionable=True,
                    metadata={"urgent_count": len(urgent_tasks)},
                )
            )

        if len(high_tasks) > 0 and len(urgent_tasks) == 0:
            recommendations.append(
                Recommendation(
                    type="priority_suggestion",
                    title="Foco em Tarefas Importantes",
                    description=f"Você tem {len(high_tasks)} tarefas de alta prioridade. Comece por elas para maximizar sua produtividade!",
                    priority="LOW",
                    actionable=False,
                    metadata={"high_priority_count": len(high_tasks)},
                )
            )

        return recommendations

    def _suggest_task_grouping(self, tasks: List[TaskData]) -> List[Recommendation]:
        recommendations = []

        # Agrupar tarefas por tags
        tags_count = {}
        for task in tasks:
            if task.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]:
                for tag in task.tags:
                    tags_count[tag] = tags_count.get(tag, 0) + 1

        # Sugerir agrupamento se houver tags com múltiplas tarefas
        common_tags = {tag: count for tag, count in tags_count.items() if count >= 3}

        if common_tags:
            most_common_tag = max(common_tags, key=common_tags.get)
            recommendations.append(
                Recommendation(
                    type="task_grouping",
                    title="Agrupe Tarefas Similares",
                    description=f"Você tem {common_tags[most_common_tag]} tarefas relacionadas a '{most_common_tag}'. Considere dedicar um bloco de tempo para concluí-las em sequência.",
                    priority="LOW",
                    actionable=True,
                    metadata={"tag": most_common_tag, "count": common_tags[most_common_tag]},
                )
            )

        return recommendations

    def _suggest_breaks(
        self, tasks: List[TaskData], events: List[EventData]
    ) -> List[Recommendation]:
        recommendations = []

        # Calcular tempo estimado total de tarefas pendentes hoje
        now = datetime.now()
        today_end = now.replace(hour=23, minute=59, second=59)

        today_tasks = [
            t
            for t in tasks
            if t.dueDate
            and now <= t.dueDate <= today_end
            and t.status == TaskStatus.TODO
        ]

        total_estimated_time = sum(t.estimatedTime or 0 for t in today_tasks)

        # Se mais de 4 horas de trabalho, sugerir pausas
        if total_estimated_time > 240:  # 4 horas em minutos
            recommendations.append(
                Recommendation(
                    type="break_suggestion",
                    title="Lembre-se de Fazer Pausas",
                    description=f"Você tem aproximadamente {total_estimated_time // 60} horas de trabalho planejadas hoje. Não esqueça de fazer pausas regulares!",
                    priority="LOW",
                    actionable=False,
                    metadata={"estimated_hours": total_estimated_time / 60},
                )
            )

        return recommendations
