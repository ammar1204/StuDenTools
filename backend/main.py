from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()
from modules.gpa_calculator import router as gpa_calculator_router
from modules.pdf_to_word import router as pdf_to_word_router
from modules.pdf_merge_split import router as pdf_merge_split_router
from modules.pdf_compressor import router as pdf_compressor_router
from modules.paraphraser import router as paraphraser_router
from modules.image_to_pdf import router as image_to_pdf_router
from modules.feedback import router as feedback_router
from modules.citation_generator import router as citation_router
from modules.auto_timetable import router as auto_timetable_router

app = FastAPI(
    title="StuDenTools API",
    description="A collection of student productivity tools",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
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

app.include_router(gpa_calculator_router)
app.include_router(pdf_to_word_router)
app.include_router(pdf_merge_split_router)
app.include_router(pdf_compressor_router)
app.include_router(paraphraser_router)
app.include_router(image_to_pdf_router)
app.include_router(feedback_router)
app.include_router(citation_router)
app.include_router(auto_timetable_router)

@app.get("/")
async def root():
    return {"message": "Welcome to StuDenTools API"}


@app.get("/health")
async def health():
    return {"status": "ok"}

