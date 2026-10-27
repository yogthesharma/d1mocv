"""FastAPI application factory."""

from __future__ import annotations

import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.data.loader import load_data
from app.routers.api import router

log = logging.getLogger("app.request")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.data = load_data(get_settings().data_dir)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Wind forecast decision support",
        description=(
            "Latest Elexon wind forecast available at the D-1 buying decision, and how wrong "
            "the forecasts are. National level, January 2026, all times UTC, generation in MW."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        log.info(
            "%s %s %d %.0fms", request.method, request.url.path, response.status_code, elapsed_ms
        )
        return response

    register_error_handlers(app)
    app.include_router(router)
    return app


app = create_app()
