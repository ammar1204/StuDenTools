from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from logger import logger

router = APIRouter()

class LogEvent(BaseModel):
    tool_name: str
    action: str
    file_size_mb: Optional[float] = None
    details: Optional[str] = None

@router.post("/api/analytics/event")
async def log_frontend_event(event: LogEvent, request: Request):
    # Log frontend event specifically
    log_msg = f"FRONTEND EVENT | Tool: {event.tool_name} | Action: {event.action}"
    if event.file_size_mb is not None:
        log_msg += f" | Size: {event.file_size_mb:.2f}MB"
    if event.details:
        log_msg += f" | Details: {event.details}"
        
    logger.info(log_msg)
    return {"status": "logged"}
