from fastapi import FastAPI, Request
import time
from logger import logger
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()
from modules.pdf_to_word import router as pdf_to_word_router
from modules.pdf_compressor import router as pdf_compressor_router
from modules.paraphraser import router as paraphraser_router
from modules.feedback import router as feedback_router
from modules.citation_generator import router as citation_router
from modules.auto_timetable import router as auto_timetable_router
from modules.analytics import router as analytics_router

app = FastAPI(
    title="StuDenTools API",
    description="A collection of student productivity tools",
    version="1.0.0"
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Don't clutter logs with health checks
    if request.url.path != "/health":
        logger.info(
            f"Path: {request.url.path} | Method: {request.method} | "
            f"Status: {response.status_code} | Time: {process_time:.3f}s"
        )
    return response

from rate_limiter import setup_rate_limiting
setup_rate_limiting(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Original-Size",
        "X-Compressed-Size",
        "X-Reduction-Percent",
        "X-Original-Size-Formatted",
        "X-Compressed-Size-Formatted",
    ],
)

app.include_router(pdf_to_word_router)
app.include_router(pdf_compressor_router)
app.include_router(paraphraser_router)
app.include_router(feedback_router)
app.include_router(citation_router)
app.include_router(auto_timetable_router)
app.include_router(analytics_router)

@app.get("/")
async def root():
    return {"message": "Welcome to StuDenTools API"}


@app.get("/health")
async def health():
    return {"status": "ok"}

