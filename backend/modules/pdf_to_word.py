import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from pdf2docx import Converter

router = APIRouter()

# Rate limiting
from rate_limiter import limiter, RATE_LIMITS

MAX_FILE_SIZE = 10 * 1024 * 1024


def cleanup_temp_dir(temp_dir: str):
    """Remove temporary directory and all its contents."""
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/api/pdf-to-word")
@limiter.limit(RATE_LIMITS["file_processing"])
async def convert_pdf_to_word(request: Request, file: UploadFile = File(...)):
    """
    Convert a PDF file to an editable Word document (.docx)
    
    - File size limit: 10MB
    - Accepts: PDF files only
    - Returns: Word document (.docx)
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload a PDF file."
        )
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the 10MB limit. Your file is {len(content) / (1024 * 1024):.2f}MB"
        )
    
    # Create temporary files for processing
    temp_dir = tempfile.mkdtemp()
    pdf_path = os.path.join(temp_dir, "input.pdf")
    docx_path = os.path.join(temp_dir, "output.docx")
    
    try:
        with open(pdf_path, "wb") as pdf_file:
            pdf_file.write(content)
        
        cv = Converter(pdf_path)
        cv.convert(docx_path)
        cv.close()
        
        original_name = os.path.splitext(file.filename)[0]
        output_filename = f"{original_name}.docx"
        
        return FileResponse(
            path=docx_path,
            filename=output_filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            background=BackgroundTask(cleanup_temp_dir, temp_dir)
        )
        
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        
        raise HTTPException(
            status_code=500,
            detail=f"Conversion failed: {str(e)}"
        )
