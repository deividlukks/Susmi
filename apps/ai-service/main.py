"""
S.U.S.M.I - AI Service
Serviço de processamento de IA para o assistente inteligente
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

# Load environment variables from root .env
load_dotenv("../../.env")

app = FastAPI(
    title="S.U.S.M.I AI Service",
    description="Serviço de IA para o Assistente Inteligente Pessoal",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "gpt-4"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: Optional[dict] = None


class AnalyzeRequest(BaseModel):
    text: str
    task: str = "summarize"  # summarize, extract, classify


class AnalyzeResponse(BaseModel):
    result: str
    task: str


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "S.U.S.M.I AI Service",
        "version": "1.0.0",
    }


# Chat endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Processa uma mensagem de chat e retorna a resposta da IA.
    """
    try:
        # Check for API key
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        
        if not openai_key and not anthropic_key:
            # Fallback response when no API key is configured
            return ChatResponse(
                content="🔧 O serviço de IA precisa ser configurado. Por favor, adicione sua chave de API (OpenAI ou Anthropic) no arquivo .env para habilitar respostas inteligentes.",
                model="fallback",
                usage=None,
            )
        
        # Use OpenAI if available
        if openai_key:
            from openai import OpenAI
            
            client = OpenAI(api_key=openai_key)
            
            messages = [{"role": m.role, "content": m.content} for m in request.messages]
            
            # Add system prompt
            system_prompt = {
                "role": "system",
                "content": """Você é o S.U.S.M.I, um assistente inteligente pessoal inspirado no JARVIS.
Você é educado, eficiente e prestativo. Você ajuda o usuário com:
- Gerenciamento de tarefas e agenda
- Resposta a perguntas
- Automação de atividades
- Análise de informações

Responda sempre em português brasileiro, de forma clara e concisa."""
            }
            
            messages.insert(0, system_prompt)
            
            response = client.chat.completions.create(
                model=request.model or "gpt-4",
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
            
            return ChatResponse(
                content=response.choices[0].message.content,
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
            )
        
        # Use Anthropic as fallback
        elif anthropic_key:
            import anthropic
            
            client = anthropic.Anthropic(api_key=anthropic_key)
            
            messages = [{"role": m.role, "content": m.content} for m in request.messages if m.role != "system"]
            
            response = client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=request.max_tokens or 1000,
                system="""Você é o S.U.S.M.I, um assistente inteligente pessoal inspirado no JARVIS.
Você é educado, eficiente e prestativo. Responda sempre em português brasileiro.""",
                messages=messages,
            )
            
            return ChatResponse(
                content=response.content[0].text,
                model=response.model,
                usage={
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Analyze endpoint
@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Analisa texto para extrair informações, resumir ou classificar.
    """
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if not openai_key:
            return AnalyzeResponse(
                result="Configure a chave de API para usar análise de texto.",
                task=request.task,
            )
        
        from openai import OpenAI
        client = OpenAI(api_key=openai_key)
        
        prompts = {
            "summarize": f"Resuma o seguinte texto de forma concisa:\n\n{request.text}",
            "extract": f"Extraia as informações principais do seguinte texto:\n\n{request.text}",
            "classify": f"Classifique o seguinte texto por categoria e sentimento:\n\n{request.text}",
        }
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Você é um assistente de análise de texto."},
                {"role": "user", "content": prompts.get(request.task, prompts["summarize"])},
            ],
            temperature=0.3,
        )
        
        return AnalyzeResponse(
            result=response.choices[0].message.content,
            task=request.task,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Suggest endpoint
@app.post("/suggest")
async def suggest(context: dict):
    """
    Gera sugestões proativas baseadas no contexto do usuário.
    """
    return {
        "suggestions": [
            "Você tem 3 tarefas pendentes para hoje",
            "Considere agendar uma pausa às 15h",
            "Seu relatório mensal está pendente",
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
