import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from starlette.background import BackgroundTask
from PyPDF2 import PdfReader, PdfWriter

router = APIRouter()


def cleanup_temp_dir(temp_dir: str):
    """Remove temporary directory and all its contents."""
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

MAX_FILE_SIZE = 100 * 1024 * 1024


def format_size(size_bytes: int) -> str:
    """Format bytes to human readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def calculate_reduction(original: int, compressed: int) -> float:
    """Calculate percentage reduction."""
    if original == 0:
        return 0
    return round((1 - compressed / original) * 100, 1)


@router.post("/api/pdf/compress")
async def compress_pdf(file: UploadFile = File(...)):
    """
    Compress a PDF file to reduce its size.
    
    - File size limit: 100MB
    - Returns: Compressed PDF with before/after size info in headers
    
    Response Headers:
    - X-Original-Size: Original file size in bytes
    - X-Compressed-Size: Compressed file size in bytes
    - X-Reduction-Percent: Percentage reduction achieved
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF file."
        )
    
    content = await file.read()
    original_size = len(content)
    
    if original_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the 100MB limit. Your file is {format_size(original_size)}"
        )
    
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, "input.pdf")
    output_path = os.path.join(temp_dir, "compressed.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(content)
        
        pdf_reader = PdfReader(input_path)
        pdf_writer = PdfWriter()
        
        for page in pdf_reader.pages:
            page.compress_content_streams()
            pdf_writer.add_page(page)
        
        pdf_writer.add_metadata(pdf_reader.metadata or {})
        
        with open(output_path, "wb") as output_file:
            pdf_writer.write(output_file)
        
        compressed_size = os.path.getsize(output_path)
        reduction = calculate_reduction(original_size, compressed_size)
        
        original_name = os.path.splitext(file.filename)[0]
        output_filename = f"{original_name}_compressed.pdf"
        
        response = FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            background=BackgroundTask(cleanup_temp_dir, temp_dir)
        )
        
        response.headers["X-Original-Size"] = str(original_size)
        response.headers["X-Compressed-Size"] = str(compressed_size)
        response.headers["X-Reduction-Percent"] = str(reduction)
        response.headers["X-Original-Size-Formatted"] = format_size(original_size)
        response.headers["X-Compressed-Size-Formatted"] = format_size(compressed_size)
        
        return response
        
    except HTTPException:
        cleanup_temp_dir(temp_dir)
        raise
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        
        raise HTTPException(
            status_code=500,
            detail=f"Compression failed: {str(e)}"
        )


@router.post("/api/pdf/compress/preview")
async def compress_pdf_preview(file: UploadFile = File(...)):
    """
    Preview compression results without downloading the file.
    
    - Returns: JSON with original size, estimated compressed size, and reduction percentage
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF file."
        )
    
    content = await file.read()
    original_size = len(content)
    
    if original_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the 100MB limit."
        )
    
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, "input.pdf")
    output_path = os.path.join(temp_dir, "compressed.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(content)
        
        pdf_reader = PdfReader(input_path)
        pdf_writer = PdfWriter()
        
        for page in pdf_reader.pages:
            page.compress_content_streams()
            pdf_writer.add_page(page)
        
        with open(output_path, "wb") as output_file:
            pdf_writer.write(output_file)
        
        compressed_size = os.path.getsize(output_path)
        reduction = calculate_reduction(original_size, compressed_size)
        
        return {
            "filename": file.filename,
            "original_size": original_size,
            "original_size_formatted": format_size(original_size),
            "compressed_size": compressed_size,
            "compressed_size_formatted": format_size(compressed_size),
            "reduction_percent": reduction,
            "pages": len(pdf_reader.pages)
        }
        
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
