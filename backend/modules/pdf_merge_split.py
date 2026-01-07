import os
import shutil
import tempfile
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from PyPDF2 import PdfReader, PdfWriter

router = APIRouter()


def cleanup_temp_dir(temp_dir: str):
    """Remove temporary directory and all its contents."""
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)


MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/api/pdf/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    """
    Merge multiple PDF files into a single PDF document.
    
    - Accepts: Multiple PDF files
    - File size limit: 10MB per file
    - Returns: Single merged PDF document
    """
    
    if len(files) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please upload at least 2 PDF files to merge."
        )
    
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.filename}. Only PDF files are allowed."
            )
    
    temp_dir = tempfile.mkdtemp()
    output_path = os.path.join(temp_dir, "merged.pdf")
    temp_files = []
    
    try:
        pdf_writer = PdfWriter()
        
        for i, file in enumerate(files):
            content = await file.read()
            
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' exceeds the 10MB limit."
                )
            
            temp_path = os.path.join(temp_dir, f"input_{i}.pdf")
            temp_files.append(temp_path)
            
            with open(temp_path, "wb") as f:
                f.write(content)
            
            pdf_reader = PdfReader(temp_path)
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)
        
        with open(output_path, "wb") as output_file:
            pdf_writer.write(output_file)
        
        return FileResponse(
            path=output_path,
            filename="merged.pdf",
            media_type="application/pdf",
            background=BackgroundTask(cleanup_temp_dir, temp_dir)
        )
        
    except HTTPException:
        cleanup_temp_dir(temp_dir)
        raise
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to merge PDFs: {str(e)}"
        )


@router.post("/api/pdf/split")
async def split_pdf(
    file: UploadFile = File(...),
    start_page: int = Form(..., description="Start page (1-indexed)"),
    end_page: int = Form(..., description="End page (1-indexed, inclusive)")
):
    """
    Split a PDF file by extracting a range of pages.
    
    - Accepts: Single PDF file
    - File size limit: 10MB
    - start_page: First page to extract (1-indexed)
    - end_page: Last page to extract (1-indexed, inclusive)
    - Returns: PDF with extracted pages
    """
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF file."
        )
    
    if start_page < 1:
        raise HTTPException(
            status_code=400,
            detail="Start page must be at least 1."
        )
    
    if end_page < start_page:
        raise HTTPException(
            status_code=400,
            detail="End page must be greater than or equal to start page."
        )
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the 10MB limit."
        )
    
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, "input.pdf")
    output_path = os.path.join(temp_dir, "split.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(content)
        
        pdf_reader = PdfReader(input_path)
        total_pages = len(pdf_reader.pages)
        
        if start_page > total_pages:
            raise HTTPException(
                status_code=400,
                detail=f"Start page ({start_page}) exceeds total pages ({total_pages})."
            )
        
        if end_page > total_pages:
            raise HTTPException(
                status_code=400,
                detail=f"End page ({end_page}) exceeds total pages ({total_pages})."
            )
        
        pdf_writer = PdfWriter()
        for page_num in range(start_page - 1, end_page):
            pdf_writer.add_page(pdf_reader.pages[page_num])
        
        with open(output_path, "wb") as output_file:
            pdf_writer.write(output_file)
        
        original_name = os.path.splitext(file.filename)[0]
        output_filename = f"{original_name}_pages_{start_page}-{end_page}.pdf"
        
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            background=BackgroundTask(cleanup_temp_dir, temp_dir)
        )
        
    except HTTPException:
        cleanup_temp_dir(temp_dir)
        raise
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to split PDF: {str(e)}"
        )


@router.post("/api/pdf/info")
async def get_pdf_info(file: UploadFile = File(...)):
    """
    Get information about a PDF file (useful before splitting).
    
    - Returns: Total page count and file size
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
            detail="File size exceeds the 10MB limit."
        )
    
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, "input.pdf")
    
    try:
        with open(temp_path, "wb") as f:
            f.write(content)
        
        pdf_reader = PdfReader(temp_path)
        
        return {
            "filename": file.filename,
            "total_pages": len(pdf_reader.pages),
            "file_size_mb": round(len(content) / (1024 * 1024), 2)
        }
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
