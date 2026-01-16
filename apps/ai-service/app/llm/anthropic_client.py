"""
Anthropic (Claude) LLM Client Implementation
"""

from typing import List, Optional, AsyncIterator
from anthropic import AsyncAnthropic
import anthropic
from .base import BaseLLMClient, LLMMessage, LLMResponse


class AnthropicClient(BaseLLMClient):
    """
    Anthropic (Claude) API client implementation.

    Supports Claude 3 family models (Opus, Sonnet, Haiku).
    """

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022", **kwargs):
        """
        Initialize Anthropic client.

        Args:
            api_key: Anthropic API key
            model: Model identifier (e.g., "claude-3-5-sonnet-20241022")
            **kwargs: Additional configuration
        """
        super().__init__(api_key, model, **kwargs)
        self.client = AsyncAnthropic(api_key=api_key)

    def _separate_system_message(self, messages: List[LLMMessage]) -> tuple[Optional[str], List[LLMMessage]]:
        """
        Separate system message from other messages.

        Claude API requires system message to be passed separately.

        Args:
            messages: List of all messages

        Returns:
            Tuple of (system_message, other_messages)
        """
        system_message = None
        other_messages = []

        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                other_messages.append(msg)

        return system_message, other_messages

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a completion using Anthropic API.

        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional Anthropic-specific parameters

        Returns:
            LLMResponse with the generated content
        """
        self.validate_messages(messages)

        # Separate system message
        system_message, chat_messages = self._separate_system_message(messages)
        formatted_messages = self.prepare_messages(chat_messages)

        # Build request parameters
        request_params = {
            "model": self.model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs
        }

        # Add system message if present
        if system_message:
            request_params["system"] = system_message

        response = await self.client.messages.create(**request_params)

        # Extract text content from response
        content_text = ""
        if response.content:
            for block in response.content:
                if hasattr(block, "text"):
                    content_text += block.text

        return LLMResponse(
            content=content_text,
            model=response.model,
            provider="anthropic",
            tokens_used=response.usage.input_tokens + response.usage.output_tokens,
            finish_reason=response.stop_reason or "unknown",
            metadata={
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "response_id": response.id,
                "stop_reason": response.stop_reason,
            }
        )

    async def generate_streaming(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> AsyncIterator[str]:
        """
        Generate a streaming completion using Anthropic API.

        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional Anthropic-specific parameters

        Yields:
            Chunks of the generated content
        """
        self.validate_messages(messages)

        # Separate system message
        system_message, chat_messages = self._separate_system_message(messages)
        formatted_messages = self.prepare_messages(chat_messages)

        # Build request parameters
        request_params = {
            "model": self.model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            **kwargs
        }

        # Add system message if present
        if system_message:
            request_params["system"] = system_message

        async with self.client.messages.stream(**request_params) as stream:
            async for text in stream.text_stream:
                yield text

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text.

        Note: Anthropic doesn't provide a direct token counting API,
        so this is an approximation (roughly 4 chars per token).

        Args:
            text: Text to count tokens for

        Returns:
            Approximate number of tokens
        """
        # Rough approximation: 1 token ≈ 4 characters for English text
        # This is a simplified estimate. For production, consider using
        # the Anthropic token counting endpoint when available.
        return len(text) // 4

    def get_provider_name(self) -> str:
        """Get provider name."""
        return "anthropic"

    def count_messages_tokens(self, messages: List[LLMMessage]) -> int:
        """
        Count approximate total tokens in a list of messages.

        Args:
            messages: List of messages

        Returns:
            Approximate total token count
        """
        total = 0
        for message in messages:
            # Add tokens for content
            total += self.count_tokens(message.content)
            # Add overhead for message structure (approximate)
            total += 10  # Overhead for role and formatting

        return total
