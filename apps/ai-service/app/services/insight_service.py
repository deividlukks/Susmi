from typing import List
from datetime import datetime, timedelta
from app.models.schemas import Insight, UserProductivityData, TaskStatus
import statistics


class InsightService:
    """Serviço para gerar insights sobre produtividade do usuário"""

    def generate_insights(self, data: UserProductivityData) -> List[Insight]:
        insights = []

        # Análise de taxa de conclusão
        completion_insights = self._analyze_completion_rate(data)
        insights.extend(completion_insights)

        # Análise de tempo de conclusão
        time_insights = self._analyze_completion_time(data)
        insights.extend(time_insights)

        # Análise de padrões temporais
        pattern_insights = self._analyze_time_patterns(data)
        insights.extend(pattern_insights)

        # Análise de estimativas
        estimation_insights = self._analyze_estimations(data)
        insights.extend(estimation_insights)

        return insights

    def _analyze_completion_rate(self, data: UserProductivityData) -> List[Insight]:
        insights = []
        tasks = data.tasks

        if not tasks:
            return insights

        completed = [t for t in tasks if t.status == TaskStatus.COMPLETED]
        completion_rate = (len(completed) / len(tasks)) * 100

        trend = None
        if completion_rate >= 80:
            trend = "excellent"
        elif completion_rate >= 60:
            trend = "good"
        elif completion_rate >= 40:
            trend = "moderate"
        else:
            trend = "needs_improvement"

        insights.append(
            Insight(
                category="completion",
                title="Taxa de Conclusão",
                description=f"Você concluiu {len(completed)} de {len(tasks)} tarefas ({completion_rate:.1f}%)",
                value=completion_rate,
                trend=trend,
            )
        )

        return insights

    def _analyze_completion_time(self, data: UserProductivityData) -> List[Insight]:
        insights = []
        completed_tasks = [
            t
            for t in data.tasks
            if t.status == TaskStatus.COMPLETED and t.completedAt and t.createdAt
        ]

        if not completed_tasks:
            return insights

        completion_times = [
            (t.completedAt - t.createdAt).total_seconds() / 3600  # em horas
            for t in completed_tasks
        ]

        avg_time = statistics.mean(completion_times)
        median_time = statistics.median(completion_times)

        insights.append(
            Insight(
                category="time",
                title="Tempo Médio de Conclusão",
                description=f"Em média, você leva {avg_time:.1f} horas para concluir uma tarefa",
                value=avg_time,
                trend="stable",
            )
        )

        if avg_time > median_time * 1.5:
            insights.append(
                Insight(
                    category="time",
                    title="Variação no Tempo de Conclusão",
                    description="Algumas tarefas levam muito mais tempo que outras. Considere dividir tarefas grandes em menores.",
                    value={"average": avg_time, "median": median_time},
                    trend="warning",
                )
            )

        return insights

    def _analyze_time_patterns(self, data: UserProductivityData) -> List[Insight]:
        insights = []
        completed_tasks = [
            t for t in data.tasks if t.status == TaskStatus.COMPLETED and t.completedAt
        ]

        if not completed_tasks:
            return insights

        # Analisar horários de conclusão
        completion_hours = [t.completedAt.hour for t in completed_tasks]

        if completion_hours:
            most_productive_hour = statistics.mode(completion_hours)
            
            period = "manhã" if 6 <= most_productive_hour < 12 else \
                    "tarde" if 12 <= most_productive_hour < 18 else \
                    "noite" if 18 <= most_productive_hour < 22 else "madrugada"

            insights.append(
                Insight(
                    category="patterns",
                    title="Horário Mais Produtivo",
                    description=f"Você tende a concluir mais tarefas durante a {period} (por volta das {most_productive_hour}h)",
                    value=most_productive_hour,
                    trend="info",
                )
            )

        # Analisar dias da semana
        completion_weekdays = [t.completedAt.weekday() for t in completed_tasks]
        
        if completion_weekdays:
            weekday_counts = {}
            for day in completion_weekdays:
                weekday_counts[day] = weekday_counts.get(day, 0) + 1

            most_productive_day = max(weekday_counts, key=weekday_counts.get)
            day_names = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

            insights.append(
                Insight(
                    category="patterns",
                    title="Dia Mais Produtivo",
                    description=f"{day_names[most_productive_day]} é seu dia mais produtivo da semana",
                    value=most_productive_day,
                    trend="info",
                )
            )

        return insights

    def _analyze_estimations(self, data: UserProductivityData) -> List[Insight]:
        insights = []
        tasks_with_estimates = [
            t
            for t in data.tasks
            if t.status == TaskStatus.COMPLETED
            and t.estimatedTime
            and t.actualTime
        ]

        if not tasks_with_estimates:
            return insights

        estimation_errors = [
            ((t.actualTime - t.estimatedTime) / t.estimatedTime) * 100
            for t in tasks_with_estimates
        ]

        avg_error = statistics.mean(estimation_errors)

        if abs(avg_error) < 20:
            insights.append(
                Insight(
                    category="estimation",
                    title="Estimativas Precisas",
                    description="Suas estimativas de tempo estão muito próximas da realidade!",
                    value=avg_error,
                    trend="excellent",
                )
            )
        elif avg_error > 20:
            insights.append(
                Insight(
                    category="estimation",
                    title="Subestimação de Tempo",
                    description=f"Você tende a subestimar o tempo necessário em {avg_error:.1f}%. Considere adicionar uma margem de segurança.",
                    value=avg_error,
                    trend="warning",
                )
            )
        elif avg_error < -20:
            insights.append(
                Insight(
                    category="estimation",
                    title="Superestimação de Tempo",
                    description=f"Você tende a superestimar o tempo necessário em {abs(avg_error):.1f}%. Você pode ser mais otimista!",
                    value=avg_error,
                    trend="info",
                )
            )

        return insights
