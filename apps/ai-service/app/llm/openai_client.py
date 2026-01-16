"""
OpenAI LLM Client Implementation
"""

from typing import List, Optional, AsyncIterator
from openai import AsyncOpenAI
import tiktoken
from .base import BaseLLMClient, LLMMessage, LLMResponse


class OpenAIClient(BaseLLMClient):
    """
    OpenAI API client implementation.

    Supports models like GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, etc.
    """

    def __init__(self, api_key: str, model: str = "gpt-4", **kwargs):
        """
        Initialize OpenAI client.

        Args:
            api_key: OpenAI API key
            model: Model identifier (e.g., "gpt-4", "gpt-3.5-turbo")
            **kwargs: Additional configuration
        """
        super().__init__(api_key, model, **kwargs)
        self.client = AsyncOpenAI(api_key=api_key)

        # Initialize tokenizer for counting tokens
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            # Fallback to cl100k_base encoding for newer models
            self.encoding = tiktoken.get_encoding("cl100k_base")

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a completion using OpenAI API.

        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional OpenAI-specific parameters

        Returns:
            LLMResponse with the generated content
        """
        self.validate_messages(messages)
        formatted_messages = self.prepare_messages(messages)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )

        choice = response.choices[0]

        return LLMResponse(
            content=choice.message.content or "",
            model=response.model,
            provider="openai",
            tokens_used=response.usage.total_tokens if response.usage else 0,
            finish_reason=choice.finish_reason or "unknown",
            metadata={
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "response_id": response.id,
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
        Generate a streaming completion using OpenAI API.

        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional OpenAI-specific parameters

        Yields:
            Chunks of the generated content
        """
        self.validate_messages(messages)
        formatted_messages = self.prepare_messages(messages)

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
            **kwargs
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text using tiktoken.

        Args:
            text: Text to count tokens for

        Returns:
            Number of tokens
        """
        return len(self.encoding.encode(text))

    def get_provider_name(self) -> str:
        """Get provider name."""
        return "openai"

    def count_messages_tokens(self, messages: List[LLMMessage]) -> int:
        """
        Count total tokens in a list of messages.

        Args:
            messages: List of messages

        Returns:
            Total token count
        """
        # Approximate token count for messages
        # OpenAI uses tokens_per_message = 3 and tokens_per_name = 1
        tokens_per_message = 3
        tokens_per_name = 1

        num_tokens = 0
        for message in messages:
            num_tokens += tokens_per_message
            num_tokens += self.count_tokens(message.content)
            num_tokens += self.count_tokens(message.role)

        num_tokens += 3  # Every reply is primed with <|start|>assistant<|message|>

        return num_tokens
