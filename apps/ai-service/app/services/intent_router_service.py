"""
Intent Router Service

Classifies user commands and routes them to appropriate handlers.
Uses LLM to understand natural language intentions.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from enum import Enum
import json

from ..llm.factory import get_llm_client
from ..llm.base import LLMMessage


class IntentType(str, Enum):
    """Types of user intents."""
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    DELETE_TASK = "delete_task"
    LIST_TASKS = "list_tasks"
    SEARCH_TASKS = "search_tasks"
    CREATE_EVENT = "create_event"
    UPDATE_EVENT = "update_event"
    CREATE_HABIT = "create_habit"
    TRACK_HABIT = "track_habit"
    ANALYZE_HABITS = "analyze_habits"
    GET_BRIEFING = "get_briefing"
    GET_RECOMMENDATIONS = "get_recommendations"
    GENERAL_QUERY = "general_query"
    UNKNOWN = "unknown"


class Intent(BaseModel):
    """Represents a classified user intent."""
    type: IntentType
    confidence: float
    parameters: Dict[str, Any] = {}
    original_text: str
    explanation: Optional[str] = None


class IntentRouterService:
    """
    Service for classifying user intents using LLM.

    Analyzes natural language input and determines what action
    the user wants to perform.
    """

    def __init__(self):
        """Initialize the intent router service."""
        self.llm_client = get_llm_client()

    async def classify_intent(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> Intent:
        """
        Classify user intent from natural language input.

        Args:
            user_input: User's natural language command
            context: Optional context information (user preferences, recent actions, etc.)

        Returns:
            Classified Intent object
        """
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(user_input, context)

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt)
        ]

        response = await self.llm_client.generate(
            messages=messages,
            temperature=0.3,  # Low temperature for more consistent classification
            max_tokens=1024
        )

        # Parse LLM response
        intent = self._parse_llm_response(response.content, user_input)
        return intent

    def _build_system_prompt(self) -> str:
        """Build system prompt for intent classification."""
        return """You are an intent classifier for a productivity assistant called Susmi.

Your job is to analyze user commands and classify them into one of these intent types:

**Task Management:**
- create_task: User wants to create a new task
- update_task: User wants to modify an existing task
- delete_task: User wants to delete a task
- list_tasks: User wants to see their tasks
- search_tasks: User wants to search for specific tasks

**Event Management:**
- create_event: User wants to add a calendar event
- update_event: User wants to modify an event

**Habit Tracking:**
- create_habit: User wants to create a new habit to track
- track_habit: User wants to log habit completion
- analyze_habits: User wants insights about their habits

**Insights & Recommendations:**
- get_briefing: User wants a daily summary/briefing
- get_recommendations: User wants suggestions or recommendations

**General:**
- general_query: User is asking a question or wants information
- unknown: Intent is unclear

For each classification, provide:
1. Intent type
2. Confidence score (0-1)
3. Extracted parameters (if any)
4. Brief explanation

Respond ONLY with valid JSON in this format:
{
  "type": "intent_type",
  "confidence": 0.95,
  "parameters": {
    "title": "extracted value",
    "priority": "extracted value",
    ...
  },
  "explanation": "Brief explanation of classification"
}"""

    def _build_user_prompt(self, user_input: str, context: Optional[Dict[str, Any]]) -> str:
        """Build user prompt with input and context."""
        prompt = f"User command: \"{user_input}\""

        if context:
            prompt += f"\n\nContext: {json.dumps(context, indent=2)}"

        prompt += "\n\nClassify this command and extract relevant parameters."

        return prompt

    def _parse_llm_response(self, response_text: str, original_input: str) -> Intent:
        """
        Parse LLM response into Intent object.

        Args:
            response_text: Raw LLM response
            original_input: Original user input

        Returns:
            Intent object
        """
        try:
            # Try to extract JSON from response
            response_text = response_text.strip()

            # Handle markdown code blocks
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            data = json.loads(response_text)

            # Validate intent type
            intent_type = data.get("type", "unknown")
            if intent_type not in [t.value for t in IntentType]:
                intent_type = "unknown"

            return Intent(
                type=IntentType(intent_type),
                confidence=float(data.get("confidence", 0.5)),
                parameters=data.get("parameters", {}),
                original_text=original_input,
                explanation=data.get("explanation")
            )

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Fallback to unknown intent if parsing fails
            return Intent(
                type=IntentType.UNKNOWN,
                confidence=0.0,
                parameters={},
                original_text=original_input,
                explanation=f"Failed to parse intent: {str(e)}"
            )

    async def batch_classify(self, inputs: List[str]) -> List[Intent]:
        """
        Classify multiple intents in batch.

        Args:
            inputs: List of user inputs to classify

        Returns:
            List of classified Intents
        """
        # For now, process sequentially
        # In production, could implement parallel processing
        intents = []
        for user_input in inputs:
            intent = await self.classify_intent(user_input)
            intents.append(intent)

        return intents

    def get_supported_intents(self) -> List[str]:
        """
        Get list of supported intent types.

        Returns:
            List of intent type names
        """
        return [intent.value for intent in IntentType]
