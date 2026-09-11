import os
import sys
import json
import logging
from contextlib import asynccontextmanager

# Add parent directory to sys.path so ml module can be imported cleanly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.errors import http_exception_handler, validation_exception_handler

from app.routers import (
    auth,
    facilities,
    assessments,
    inputs,
    summary,
    leak_points,
    recommendations,
    simulate,
    apply,
    history,
    export,
    datasets_router
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("app.main")

async def seed_initial_datasets():
    db = get_database()
    
    # 1. Seed Emission Factors
    ef_count = await db.emission_factors.count_documents({})
    if ef_count == 0:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        possible_ef_paths = [
            os.path.join(base_dir, "datasets", "emission_factors", "emission_factors_v1.json"),
            os.path.join(os.path.dirname(base_dir), "datasets", "emission_factors", "emission_factors_v1.json"),
        ]
        ef_list = None
        for p in possible_ef_paths:
            if os.path.exists(p):
                with open(p, "r") as f:
                    ef_list = json.load(f)
                break
        if ef_list:
            await db.emission_factors.insert_many(ef_list)
            logger.info(f"Seeded {len(ef_list)} emission factor records into MongoDB.")

    # 2. Seed Intervention Library
    int_count = await db.intervention_library.count_documents({})
    if int_count == 0:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        possible_int_paths = [
            os.path.join(base_dir, "datasets", "intervention_library", "interventions_v1.json"),
            os.path.join(os.path.dirname(base_dir), "datasets", "intervention_library", "interventions_v1.json"),
        ]
        int_list = None
        for p in possible_int_paths:
            if os.path.exists(p):
                with open(p, "r") as f:
                    int_list = json.load(f)
                break
        if int_list:
            await db.intervention_library.insert_many(int_list)
            logger.info(f"Seeded {len(int_list)} intervention library records into MongoDB.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing FastAPI server...")
    await connect_to_mongo()
    await seed_initial_datasets()
    try:
        from ml.inference.ranker import load_ml_model
        model_path = getattr(settings, "ML_MODEL_PATH", "./ml/models/recommender_v1.joblib")
        load_ml_model(model_path)
    except Exception as e:
        logger.info(f"ML ranker module not present ({e}); backend will operate with built-in rule-based fallback.")
    yield
    logger.info("Shutting down FastAPI server...")
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(facilities.router, prefix=settings.API_V1_STR)
app.include_router(assessments.router, prefix=settings.API_V1_STR)
app.include_router(inputs.router, prefix=settings.API_V1_STR)
app.include_router(summary.router, prefix=settings.API_V1_STR)
app.include_router(leak_points.router, prefix=settings.API_V1_STR)
app.include_router(recommendations.router, prefix=settings.API_V1_STR)
app.include_router(simulate.router, prefix=settings.API_V1_STR)
app.include_router(apply.router, prefix=settings.API_V1_STR)
app.include_router(history.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)
app.include_router(datasets_router.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }
