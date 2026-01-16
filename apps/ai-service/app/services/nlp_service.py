"""
Natural Language Processing Service

Handles natural language understanding and generation for the Susmi assistant.
"""

from typing import List, Dict, Any, Optional, AsyncIterator
from pydantic import BaseModel
from datetime import datetime

from ..llm.factory import get_llm_client
from ..llm.base import LLMMessage, LLMResponse


class ConversationMessage(BaseModel):
    """Represents a message in a conversation."""
    role: str
    content: str
    timestamp: datetime = datetime.now()


class NLPResponse(BaseModel):
    """Response from NLP service."""
    text: str
    confidence: float = 1.0
    metadata: Optional[Dict[str, Any]] = None


class NLPService:
    """
    Service for natural language processing.

    Provides capabilities for:
    - Conversational responses
    - Text generation
    - Question answering
    - Command processing
    """

    def __init__(self):
        """Initialize NLP service."""
        self.llm_client = get_llm_client()

    async def generate_response(
        self,
        user_message: str,
        conversation_history: Optional[List[ConversationMessage]] = None,
        system_prompt: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
    ) -> NLPResponse:
        """
        Generate a conversational response.

        Args:
            user_message: User's message
            conversation_history: Previous conversation messages
            system_prompt: System prompt to set behavior
            context: Additional context information
            temperature: Sampling temperature for generation

        Returns:
            NLPResponse with generated text
        """
        messages = self._build_messages(
            user_message, conversation_history, system_prompt, context
        )

        response = await self.llm_client.generate(
            messages=messages,
            temperature=temperature,
            max_tokens=2048
        )

        return NLPResponse(
            text=response.content,
            confidence=self._calculate_confidence(response),
            metadata={
                "model": response.model,
                "provider": response.provider,
                "tokens_used": response.tokens_used,
            }
        )

    async def generate_streaming_response(
        self,
        user_message: str,
        conversation_history: Optional[List[ConversationMessage]] = None,
        system_prompt: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Generate a streaming conversational response.

        Args:
            user_message: User's message
            conversation_history: Previous conversation messages
            system_prompt: System prompt to set behavior
            context: Additional context information
            temperature: Sampling temperature for generation

        Yields:
            Chunks of generated text
        """
        messages = self._build_messages(
            user_message, conversation_history, system_prompt, context
        )

        async for chunk in self.llm_client.generate_streaming(
            messages=messages,
            temperature=temperature,
            max_tokens=2048
        ):
            yield chunk

    async def answer_question(
        self,
        question: str,
        context_data: Dict[str, Any],
        temperature: float = 0.3,
    ) -> NLPResponse:
        """
        Answer a question based on provided context.

        Args:
            question: User's question
            context_data: Context data to answer from
            temperature: Low temperature for factual answers

        Returns:
            NLPResponse with answer
        """
        system_prompt = """You are a helpful assistant for Susmi, a productivity management app.
Answer questions based on the provided context accurately and concisely.
If you don't know the answer based on the context, say so."""

        user_prompt = f"""Context:
{self._format_context(context_data)}

Question: {question}

Please provide a clear and accurate answer based on the context above."""

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt)
        ]

        response = await self.llm_client.generate(
            messages=messages,
            temperature=temperature,
            max_tokens=1024
        )

        return NLPResponse(
            text=response.content,
            confidence=self._calculate_confidence(response),
            metadata={
                "model": response.model,
                "provider": response.provider,
                "tokens_used": response.tokens_used,
                "question_type": "factual"
            }
        )

    async def summarize_text(
        self,
        text: str,
        max_length: Optional[int] = None,
        style: str = "concise"
    ) -> NLPResponse:
        """
        Summarize a given text.

        Args:
            text: Text to summarize
            max_length: Maximum length of summary
            style: Summary style ("concise", "detailed", "bullet_points")

        Returns:
            NLPResponse with summary
        """
        style_instructions = {
            "concise": "Provide a brief, concise summary in 2-3 sentences.",
            "detailed": "Provide a detailed summary covering all key points.",
            "bullet_points": "Provide a summary as a bullet-point list of key points."
        }

        instruction = style_instructions.get(style, style_instructions["concise"])

        if max_length:
            instruction += f" Keep it under {max_length} words."

        system_prompt = "You are an expert at summarizing text clearly and accurately."

        user_prompt = f"""{instruction}

Text to summarize:
{text}"""

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt)
        ]

        response = await self.llm_client.generate(
            messages=messages,
            temperature=0.3,
            max_tokens=1024
        )

        return NLPResponse(
            text=response.content,
            metadata={
                "model": response.model,
                "style": style,
                "original_length": len(text.split()),
            }
        )

    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> Dict[str, List[str]]:
        """
        Extract named entities from text.

        Args:
            text: Text to extract entities from
            entity_types: Types of entities to extract (dates, times, names, etc.)

        Returns:
            Dictionary of entity types to extracted values
        """
        if entity_types is None:
            entity_types = ["dates", "times", "durations", "priorities", "categories"]

        system_prompt = """You are an entity extraction assistant.
Extract the requested entity types from the text.
Respond with JSON only."""

        user_prompt = f"""Extract these entity types: {', '.join(entity_types)}

Text: "{text}"

Respond with JSON in this format:
{{
  "entity_type": ["value1", "value2", ...],
  ...
}}"""

        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt)
        ]

        response = await self.llm_client.generate(
            messages=messages,
            temperature=0.2,
            max_tokens=512
        )

        # Parse JSON response
        import json
        try:
            entities = json.loads(response.content.strip())
            return entities
        except json.JSONDecodeError:
            return {}

    def _build_messages(
        self,
        user_message: str,
        conversation_history: Optional[List[ConversationMessage]],
        system_prompt: Optional[str],
        context: Optional[Dict[str, Any]]
    ) -> List[LLMMessage]:
        """Build message list for LLM."""
        messages = []

        # Add system prompt
        if system_prompt:
            messages.append(LLMMessage(role="system", content=system_prompt))
        else:
            messages.append(LLMMessage(
                role="system",
                content=self._get_default_system_prompt(context)
            ))

        # Add conversation history
        if conversation_history:
            for msg in conversation_history[-10:]:  # Keep last 10 messages
                messages.append(LLMMessage(role=msg.role, content=msg.content))

        # Add current user message
        messages.append(LLMMessage(role="user", content=user_message))

        return messages

    def _get_default_system_prompt(self, context: Optional[Dict[str, Any]]) -> str:
        """Get default system prompt."""
        prompt = """You are Susmi, an intelligent productivity assistant.

You help users manage their tasks, events, habits, and overall productivity.
You provide helpful, concise, and actionable responses.

Current capabilities:
- Task management (create, update, list tasks)
- Event scheduling
- Habit tracking
- Daily briefings and summaries
- Recommendations and insights"""

        if context:
            prompt += f"\n\nCurrent context:\n{self._format_context(context)}"

        return prompt

    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context data for prompts."""
        import json
        return json.dumps(context, indent=2, default=str)

    def _calculate_confidence(self, response: LLMResponse) -> float:
        """Calculate confidence score for response."""
        # Simple heuristic based on finish reason and length
        if response.finish_reason == "stop":
            return 0.9
        elif response.finish_reason == "length":
            return 0.7
        else:
            return 0.5
