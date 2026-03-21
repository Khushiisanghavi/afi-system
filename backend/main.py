from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router as analysis_router
from backend.api.auth_routes import router as auth_router
from backend.api.wellness_routes import router as wellness_router
from backend.api.creator_routes import router as creator_router
from backend.api.wellbeing_routes import router as wellbeing_router
from backend.database.db import engine
from backend.database import models
from backend.core.ml.model import AFIPredictor

app = FastAPI(title="AFI API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

app.include_router(auth_router, tags=["Auth"])
app.include_router(analysis_router, tags=["Analysis"])
app.include_router(wellness_router, prefix="/wellness", tags=["Wellness"])
app.include_router(creator_router, prefix="/creator", tags=["Creator Studio"])
app.include_router(wellbeing_router, prefix="/wellbeing", tags=["Wellbeing"])


@app.on_event("startup")
def startup_event():
    predictor = AFIPredictor()
    predictor._load()
    print("AFI ML model ready.")


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "version": "2.2.0"}