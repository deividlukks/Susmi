import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import recommendations, insights, predictions, llm

app = FastAPI(
    title="Susmi AI Service",
    description="Serviço de IA para processamento de dados e recomendações inteligentes",
    version="2.0.0",
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])


@app.get("/")
async def root():
    return {
        "service": "Susmi AI Service",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_DEBUG,
    )
