"""
LLM API Endpoints

REST API for interacting with the LLM engine.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..services.intent_router_service import IntentRouterService, Intent
from ..services.nlp_service import NLPService, ConversationMessage, NLPResponse
from ..llm.factory import LLMFactory, get_llm_client
from ..core.config import settings


router = APIRouter()


# Request/Response Models
class ChatRequest(BaseModel):
    """Request for chat completion."""
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    context: Optional[Dict[str, Any]] = None
    temperature: float = 0.7
    stream: bool = False


class ChatResponse(BaseModel):
    """Response from chat completion."""
    response: str
    confidence: float
    metadata: Optional[Dict[str, Any]] = None


class IntentRequest(BaseModel):
    """Request for intent classification."""
    text: str
    context: Optional[Dict[str, Any]] = None


class QuestionRequest(BaseModel):
    """Request for question answering."""
    question: str
    context: Dict[str, Any]


class SummarizeRequest(BaseModel):
    """Request for text summarization."""
    text: str
    max_length: Optional[int] = None
    style: str = "concise"


class ExtractEntitiesRequest(BaseModel):
    """Request for entity extraction."""
    text: str
    entity_types: Optional[List[str]] = None


class LLMStatusResponse(BaseModel):
    """LLM engine status."""
    enabled: bool
    provider: str
    model: str
    available_providers: List[str]
    configuration: Dict[str, Any]


# Dependency to check if LLM is enabled
def check_llm_enabled():
    """Check if LLM features are enabled."""
    if not settings.ENABLE_LLM_FEATURES:
        raise HTTPException(
            status_code=503,
            detail="LLM features are disabled. Set ENABLE_LLM_FEATURES=True to enable."
        )
    return True


@router.get("/status", response_model=LLMStatusResponse)
async def get_llm_status():
    """
    Get LLM engine status and configuration.
    """
    config_validation = LLMFactory.validate_config()

    return LLMStatusResponse(
        enabled=settings.ENABLE_LLM_FEATURES,
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        available_providers=LLMFactory.get_available_providers(),
        configuration=config_validation
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, _: bool = Depends(check_llm_enabled)):
    """
    Generate a conversational response.

    Args:
        request: Chat request with message and optional history

    Returns:
        ChatResponse with generated text
    """
    try:
        nlp_service = NLPService()

        # Convert history to ConversationMessage objects
        history = None
        if request.conversation_history:
            history = [
                ConversationMessage(role=msg["role"], content=msg["content"])
                for msg in request.conversation_history
            ]

        # Generate response
        response = await nlp_service.generate_response(
            user_message=request.message,
            conversation_history=history,
            context=request.context,
            temperature=request.temperature
        )

        return ChatResponse(
            response=response.text,
            confidence=response.confidence,
            metadata=response.metadata
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, _: bool = Depends(check_llm_enabled)):
    """
    Generate a streaming conversational response.

    Args:
        request: Chat request with message and optional history

    Returns:
        StreamingResponse with generated text chunks
    """
    try:
        nlp_service = NLPService()

        # Convert history to ConversationMessage objects
        history = None
        if request.conversation_history:
            history = [
                ConversationMessage(role=msg["role"], content=msg["content"])
                for msg in request.conversation_history
            ]

        # Generate streaming response
        async def generate():
            async for chunk in nlp_service.generate_streaming_response(
                user_message=request.message,
                conversation_history=history,
                context=request.context,
                temperature=request.temperature
            ):
                yield chunk

        return StreamingResponse(generate(), media_type="text/plain")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming chat failed: {str(e)}")


@router.post("/intent/classify", response_model=Intent)
async def classify_intent(request: IntentRequest, _: bool = Depends(check_llm_enabled)):
    """
    Classify user intent from natural language.

    Args:
        request: Intent request with text to classify

    Returns:
        Classified Intent object
    """
    try:
        router_service = IntentRouterService()
        intent = await router_service.classify_intent(
            user_input=request.text,
            context=request.context
        )
        return intent

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intent classification failed: {str(e)}")


@router.post("/question", response_model=ChatResponse)
async def answer_question(request: QuestionRequest, _: bool = Depends(check_llm_enabled)):
    """
    Answer a question based on provided context.

    Args:
        request: Question request with question and context

    Returns:
        ChatResponse with answer
    """
    try:
        nlp_service = NLPService()
        response = await nlp_service.answer_question(
            question=request.question,
            context_data=request.context
        )

        return ChatResponse(
            response=response.text,
            confidence=response.confidence,
            metadata=response.metadata
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question answering failed: {str(e)}")


@router.post("/summarize", response_model=ChatResponse)
async def summarize_text(request: SummarizeRequest, _: bool = Depends(check_llm_enabled)):
    """
    Summarize a given text.

    Args:
        request: Summarization request

    Returns:
        ChatResponse with summary
    """
    try:
        nlp_service = NLPService()
        response = await nlp_service.summarize_text(
            text=request.text,
            max_length=request.max_length,
            style=request.style
        )

        return ChatResponse(
            response=response.text,
            confidence=1.0,
            metadata=response.metadata
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@router.post("/extract-entities")
async def extract_entities(request: ExtractEntitiesRequest, _: bool = Depends(check_llm_enabled)):
    """
    Extract named entities from text.

    Args:
        request: Entity extraction request

    Returns:
        Dictionary of extracted entities
    """
    try:
        nlp_service = NLPService()
        entities = await nlp_service.extract_entities(
            text=request.text,
            entity_types=request.entity_types
        )

        return {
            "entities": entities,
            "text": request.text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entity extraction failed: {str(e)}")


@router.get("/intents")
async def list_supported_intents():
    """
    Get list of supported intent types.

    Returns:
        List of intent type names
    """
    router_service = IntentRouterService()
    return {
        "intents": router_service.get_supported_intents(),
        "count": len(router_service.get_supported_intents())
    }
