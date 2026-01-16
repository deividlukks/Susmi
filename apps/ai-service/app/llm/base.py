"""
Base LLM Client Abstract Class

Defines the interface that all LLM providers must implement.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel
from datetime import datetime


class LLMMessage(BaseModel):
    """Represents a message in the conversation."""
    role: Literal["system", "user", "assistant"]
    content: str


class LLMResponse(BaseModel):
    """Standardized response from LLM providers."""
    content: str
    model: str
    provider: str
    tokens_used: int
    finish_reason: str
    created_at: datetime = datetime.now()
    metadata: Optional[Dict[str, Any]] = None


class LLMUsageStats(BaseModel):
    """Token usage statistics."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class BaseLLMClient(ABC):
    """
    Abstract base class for LLM clients.

    All LLM provider implementations must inherit from this class
    and implement the required methods.
    """

    def __init__(self, api_key: str, model: str, **kwargs):
        """
        Initialize the LLM client.

        Args:
            api_key: API key for the provider
            model: Model identifier
            **kwargs: Additional provider-specific configuration
        """
        self.api_key = api_key
        self.model = model
        self.config = kwargs

    @abstractmethod
    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ) -> LLMResponse:
        """
        Generate a completion from the LLM.

        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters

        Returns:
            LLMResponse with the generated content
        """
        pass

    @abstractmethod
    async def generate_streaming(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        **kwargs
    ):
        """
        Generate a streaming completion from the LLM.

        Args:
            messages: List of conversation messages
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters

        Yields:
            Chunks of the generated content
        """
        pass

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a text.

        Args:
            text: Text to count tokens for

        Returns:
            Number of tokens
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get the name of the LLM provider.

        Returns:
            Provider name (e.g., "openai", "anthropic")
        """
        pass

    def validate_messages(self, messages: List[LLMMessage]) -> bool:
        """
        Validate message format and content.

        Args:
            messages: List of messages to validate

        Returns:
            True if valid, raises ValueError otherwise
        """
        if not messages:
            raise ValueError("Messages list cannot be empty")

        for msg in messages:
            if not msg.content.strip():
                raise ValueError(f"Message content cannot be empty for role: {msg.role}")

        return True

    def prepare_messages(self, messages: List[LLMMessage]) -> List[Dict[str, str]]:
        """
        Convert LLMMessage objects to provider-specific format.

        Args:
            messages: List of LLMMessage objects

        Returns:
            List of message dictionaries
        """
        return [{"role": msg.role, "content": msg.content} for msg in messages]
