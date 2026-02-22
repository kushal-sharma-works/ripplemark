from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class AnalysisServiceError(Exception):
    def __init__(self, message: str, code: str = "analysis_error", status: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AnalysisServiceError)
    async def analysis_error_handler(request: Request, exc: AnalysisServiceError):
        return JSONResponse(
            status_code=exc.status,
            content={"error": exc.code, "message": exc.message},
        )

    @app.exception_handler(ValidationError)
    async def validation_error_handler(request: Request, exc: ValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": "validation_error", "details": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "message": "Unexpected error"},
        )
