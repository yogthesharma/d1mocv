"""One JSON error shape for every failure: {"error": {"code", "message", "details"?}}."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class NotFoundError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(404, "not_found", message)


class InvalidRequestError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(422, "invalid_request", message)


def _body(code: str, message: str, details: object = None) -> dict:
    error: dict = {"code": code, "message": message}
    if details is not None:
        error["details"] = details
    return {"error": error}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, error: AppError) -> JSONResponse:
        return JSONResponse(_body(error.code, error.message), status_code=error.status_code)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, error: RequestValidationError) -> JSONResponse:
        details = jsonable_encoder(
            [
                {"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]}
                for e in error.errors()
            ]
        )
        return JSONResponse(
            _body("validation_error", "Invalid request parameters", details), status_code=422
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(_: Request, error: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(_body("http_error", str(error.detail)), status_code=error.status_code)
