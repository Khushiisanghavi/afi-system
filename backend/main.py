from fastapi import FastAPI
from backend.api.routes import router

app = FastAPI(
    title="AFI System API",
    description="Attention Fragmentation Index Analysis Engine",
    version="1.0"
)

app.include_router(router)
