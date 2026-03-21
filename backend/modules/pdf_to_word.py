import asyncio
import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
from logger import logger
from starlette.background import BackgroundTask
from pdf2docx import Converter

router = APIRouter()

from rate_limiter import limiter, RATE_LIMITS

MAX_FILE_SIZE = 5 * 1024 * 1024


def cleanup_temp_dir(temp_dir: str):
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/api/pdf-to-word")
@limiter.limit(RATE_LIMITS["file_processing"])
async def convert_pdf_to_word(request: Request, file: UploadFile = File(...)):
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload a PDF file."
        )
    
    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)
    
    logger.info(f"SERVER EVENT | Tool: pdf-to-word | Action: start | Size: {file_size_mb:.2f}MB")
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the 10MB limit. Your file is {len(content) / (1024 * 1024):.2f}MB"
        )
    
    temp_dir = tempfile.mkdtemp()
    pdf_path = os.path.join(temp_dir, "input.pdf")
    docx_path = os.path.join(temp_dir, "output.docx")
    
    try:
        with open(pdf_path, "wb") as pdf_file:
            pdf_file.write(content)
        
        def _convert():
            cv = Converter(pdf_path)
            cv.convert(docx_path)
            cv.close()

        await asyncio.to_thread(_convert)
        
        original_name = os.path.splitext(file.filename)[0]
        output_filename = f"{original_name}.docx"
        
        logger.info(f"SERVER EVENT | Tool: pdf-to-word | Action: success | File: {file.filename}")
        
        return FileResponse(
            path=docx_path,
            filename=output_filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup_temp_dir, temp_dir)
        )
        
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        
        logger.error(f"SERVER EVENT | Tool: pdf-to-word | Action: error | Error: {str(e)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Conversion failed: {str(e)}"
        )
