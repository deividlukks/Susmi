"""
LLM Factory

Factory pattern for creating LLM client instances based on provider configuration.
"""

from typing import Optional
from .base import BaseLLMClient
from .openai_client import OpenAIClient
from .anthropic_client import AnthropicClient
from ..core.config import settings


class LLMFactory:
    """
    Factory for creating LLM client instances.

    Automatically selects the appropriate client based on configuration.
    """

    @staticmethod
    def create_client(
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        **kwargs
    ) -> BaseLLMClient:
        """
        Create an LLM client instance.

        Args:
            provider: Provider name ("openai" or "anthropic"). Defaults to settings.LLM_PROVIDER
            model: Model identifier. Defaults to settings.LLM_MODEL
            api_key: API key for the provider. Defaults to settings.*_API_KEY
            **kwargs: Additional provider-specific configuration

        Returns:
            Configured LLM client instance

        Raises:
            ValueError: If provider is not supported or API key is missing
        """
        # Use defaults from settings if not provided
        provider = provider or settings.LLM_PROVIDER
        model = model or settings.LLM_MODEL

        if provider == "openai":
            api_key = api_key or settings.OPENAI_API_KEY
            if not api_key:
                raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY in environment.")
            return OpenAIClient(api_key=api_key, model=model, **kwargs)

        elif provider == "anthropic":
            api_key = api_key or settings.ANTHROPIC_API_KEY
            if not api_key:
                raise ValueError("Anthropic API key is required. Set ANTHROPIC_API_KEY in environment.")
            return AnthropicClient(api_key=api_key, model=model, **kwargs)

        else:
            raise ValueError(
                f"Unsupported LLM provider: {provider}. "
                f"Supported providers: openai, anthropic"
            )

    @staticmethod
    def create_default_client(**kwargs) -> BaseLLMClient:
        """
        Create a client using default settings.

        Args:
            **kwargs: Additional provider-specific configuration

        Returns:
            Configured LLM client instance using default settings
        """
        return LLMFactory.create_client(**kwargs)

    @staticmethod
    def get_available_providers() -> list[str]:
        """
        Get list of available LLM providers.

        Returns:
            List of provider names
        """
        return ["openai", "anthropic"]

    @staticmethod
    def validate_config() -> dict[str, bool]:
        """
        Validate LLM configuration.

        Returns:
            Dictionary with validation results for each provider
        """
        return {
            "openai": bool(settings.OPENAI_API_KEY),
            "anthropic": bool(settings.ANTHROPIC_API_KEY),
            "default_provider": settings.LLM_PROVIDER,
            "llm_enabled": settings.ENABLE_LLM_FEATURES,
        }


# Singleton instance for convenience
_default_client: Optional[BaseLLMClient] = None


def get_llm_client() -> BaseLLMClient:
    """
    Get or create a singleton LLM client instance.

    Returns:
        Singleton LLM client instance

    Raises:
        ValueError: If LLM features are disabled or configuration is invalid
    """
    global _default_client

    if not settings.ENABLE_LLM_FEATURES:
        raise ValueError("LLM features are disabled. Set ENABLE_LLM_FEATURES=True in environment.")

    if _default_client is None:
        _default_client = LLMFactory.create_default_client()

    return _default_client


def reset_llm_client():
    """Reset the singleton LLM client instance."""
    global _default_client
    _default_client = None
