import os
import shutil
import tempfile
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from PIL import Image

router = APIRouter()

# Rate limiting
from rate_limiter import limiter, RATE_LIMITS


def cleanup_temp_dir(temp_dir: str):
    """Remove temporary directory and all its contents."""
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

MAX_FILE_SIZE = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp', '.gif'}


def get_file_extension(filename: str) -> str:
    """Get lowercase file extension."""
    return os.path.splitext(filename)[1].lower()


def crop_image(image: Image.Image, margin_percent: int = 0) -> Image.Image:
    """
    Crop image by removing margin from all sides.
    margin_percent: percentage to crop from each edge (0-20)
    """
    if margin_percent <= 0:
        return image
    
    margin_percent = min(margin_percent, 20)
    
    width, height = image.size
    margin_x = int(width * margin_percent / 100)
    margin_y = int(height * margin_percent / 100)
    
    crop_box = (margin_x, margin_y, width - margin_x, height - margin_y)
    
    return image.crop(crop_box)


def prepare_image_for_pdf(image: Image.Image) -> Image.Image:
    """Convert image to RGB mode suitable for PDF."""
    if image.mode == 'RGBA':
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])
        return background
    elif image.mode != 'RGB':
        return image.convert('RGB')
    return image


@router.post("/api/images-to-pdf")
@limiter.limit(RATE_LIMITS["file_processing"])
async def convert_images_to_pdf(
    request: Request,
    files: List[UploadFile] = File(...),
    crop_margin: Optional[int] = Form(default=0, description="Crop margin percentage (0-20)"),
    auto_order: Optional[bool] = Form(default=True, description="Auto-order by filename")
):
    """
    Convert multiple images into a single PDF document.
    
    - Supported formats: PNG, JPG, JPEG, BMP, TIFF, WebP, GIF
    - File size limit: 10MB per image
    - Max images: 50
    - crop_margin: Percentage to crop from each edge (0-20)
    - auto_order: Sort images alphabetically by filename
    
    Returns: Single PDF containing all images
    """
    
    if len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Please upload at least one image."
        )
    
    if len(files) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 images allowed per conversion."
        )
    
    # Validate crop margin
    crop_margin = max(0, min(crop_margin or 0, 20))
    
    for file in files:
        extension = get_file_extension(file.filename)
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.filename}. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
            )
    
    temp_dir = tempfile.mkdtemp()
    temp_files = []
    
    try:
        file_data = []
        for i, file in enumerate(files):
            content = await file.read()
            
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{file.filename}' exceeds the 10MB limit."
                )
            
            extension = get_file_extension(file.filename)
            temp_path = os.path.join(temp_dir, f"img_{i}{extension}")
            temp_files.append(temp_path)
            
            with open(temp_path, "wb") as f:
                f.write(content)
            
            file_data.append({
                "path": temp_path,
                "filename": file.filename,
                "index": i
            })
        
        if auto_order:
            file_data.sort(key=lambda x: x["filename"].lower())
        
        images = []
        for data in file_data:
            img = Image.open(data["path"])
            
            if crop_margin > 0:
                img = crop_image(img, crop_margin)
            
            img = prepare_image_for_pdf(img)
            images.append(img)
        
        if not images:
            raise HTTPException(
                status_code=400,
                detail="No valid images to process."
            )
        
        output_path = os.path.join(temp_dir, "output.pdf")
        
        first_image = images[0]
        if len(images) > 1:
            first_image.save(
                output_path,
                "PDF",
                save_all=True,
                append_images=images[1:]
            )
        else:
            first_image.save(output_path, "PDF")
        
        for img in images:
            img.close()
        
        return FileResponse(
            path=output_path,
            filename="images_combined.pdf",
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
            detail=f"Conversion failed: {str(e)}"
        )


@router.post("/api/image-to-pdf")
@limiter.limit(RATE_LIMITS["file_processing"])
async def convert_single_image_to_pdf(
    request: Request,
    file: UploadFile = File(...),
    crop_margin: Optional[int] = Form(default=0, description="Crop margin percentage (0-20)")
):
    """
    Convert a single image to PDF.
    
    - Supported formats: PNG, JPG, JPEG, BMP, TIFF, WebP, GIF
    - File size limit: 10MB
    - crop_margin: Percentage to crop from each edge (0-20)
    """
    
    extension = get_file_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Supported: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the 10MB limit."
        )
    
    crop_margin = max(0, min(crop_margin or 0, 20))
    
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, f"input{extension}")
    output_path = os.path.join(temp_dir, "output.pdf")
    
    try:
        with open(input_path, "wb") as f:
            f.write(content)
        
        img = Image.open(input_path)
        
        if crop_margin > 0:
            img = crop_image(img, crop_margin)
        
        # Convert to RGB
        img = prepare_image_for_pdf(img)
        
        # Save as PDF
        img.save(output_path, "PDF")
        img.close()
        
        original_name = os.path.splitext(file.filename)[0]
        output_filename = f"{original_name}.pdf"
        
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
            detail=f"Conversion failed: {str(e)}"
        )
