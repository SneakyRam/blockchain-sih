from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import get_settings
from app.graph.service import get_graph_service
from app.auth.service import get_auth_service
from app.realtime.websocket import router as realtime_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await get_graph_service().connect()
    await get_auth_service().startup()
    yield
    await get_graph_service().close()


app = FastAPI(title="SIH26183 Crypto Fraud Attribution API", version="7.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(realtime_router)


@app.get("/")
async def home():
    return {
        "status": "ok",
        "service": "SIH26183 Crypto Fraud Attribution API",
        "docs": "/docs",
        "frontend": "Run the separate frontend application for the investigator workspace.",
    }
