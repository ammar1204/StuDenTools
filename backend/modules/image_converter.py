import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from PIL import Image

router = APIRouter()

# Rate limiting
from rate_limiter import limiter, RATE_LIMITS

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif', '.webp', '.gif'}

OUTPUT_FORMATS = {
    'png': {'pil_format': 'PNG', 'mime': 'image/png', 'ext': '.png'},
    'jpg': {'pil_format': 'JPEG', 'mime': 'image/jpeg', 'ext': '.jpg'},
    'webp': {'pil_format': 'WEBP', 'mime': 'image/webp', 'ext': '.webp'},
    'bmp': {'pil_format': 'BMP', 'mime': 'image/bmp', 'ext': '.bmp'},
}


def cleanup_temp_dir(temp_dir: str):
    """Remove temporary directory and all its contents."""
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)


def get_file_extension(filename: str) -> str:
    """Get lowercase file extension."""
    return os.path.splitext(filename)[1].lower()


@router.post("/api/convert-image")
@limiter.limit(RATE_LIMITS["file_processing"])
async def convert_image(
    request: Request,
    file: UploadFile = File(...),
    output_format: str = Form(..., description="Target format: png, jpg, webp, bmp"),
):
    """
    Convert an image to a different format.

    - Supported input formats: PNG, JPG, JPEG, BMP, TIFF, WebP, GIF
    - Supported output formats: PNG, JPG, WEBP, BMP
    - File size limit: 50MB
    """
    # Validate output format
    output_format = output_format.lower().strip()
    if output_format == 'jpeg':
        output_format = 'jpg'

    if output_format not in OUTPUT_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported output format '{output_format}'. Supported: {', '.join(OUTPUT_FORMATS.keys())}"
        )

    # Validate input file type
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
            detail="File size exceeds the 50MB limit."
        )

    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, f"input{extension}")
    fmt = OUTPUT_FORMATS[output_format]
    original_name = os.path.splitext(file.filename)[0]
    output_filename = f"{original_name}{fmt['ext']}"
    output_path = os.path.join(temp_dir, output_filename)

    try:
        with open(input_path, "wb") as f:
            f.write(content)

        img = Image.open(input_path)

        # Handle transparency: flatten RGBA to RGB for formats that don't support it
        if output_format in ('jpg', 'bmp') and img.mode in ('RGBA', 'LA', 'PA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif output_format in ('jpg', 'bmp') and img.mode != 'RGB':
            img = img.convert('RGB')
        elif img.mode == 'P' and output_format == 'png':
            img = img.convert('RGBA')
        elif img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA' if output_format in ('png', 'webp') else 'RGB')

        # Save with good quality defaults
        save_kwargs = {}
        if output_format == 'jpg':
            save_kwargs['quality'] = 95
        elif output_format == 'webp':
            save_kwargs['quality'] = 90

        img.save(output_path, fmt['pil_format'], **save_kwargs)
        img.close()

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type=fmt['mime'],
            background=BackgroundTask(cleanup_temp_dir, temp_dir),
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
