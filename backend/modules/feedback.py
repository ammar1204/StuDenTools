import json
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/api/feedback",
    tags=["feedback"]
)

DATA_FILE = "backend/data/feedback.json"

class FeedbackModel(BaseModel):
    type: str = "general"  # 'bug', 'feature', 'other', default 'general'
    message: str
    email: Optional[str] = None

def load_feedback():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_feedback(feedback_list):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(feedback_list, f, indent=2)

async def send_email_notification(feedback: FeedbackModel):
    api_key = os.getenv("RESEND_API_KEY")
    recipient = os.getenv("MAIL_TO")
    
    if not api_key or not recipient:
        print("Resend API Key or MAIL_TO missing. Skipping email.")
        return

    html = f"""
    <h3>New Feedback Received</h3>
    <p><strong>Type:</strong> {feedback.type}</p>
    <p><strong>Message:</strong><br>{feedback.message}</p>
    <p><strong>User Email:</strong> {feedback.email or 'Anonymous'}</p>
    """

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "StuDenTools <onboarding@resend.dev>",
                    "to": [recipient],
                    "subject": f"StuDenTools Feedback: {feedback.type.title()}",
                    "html": html
                }
            )
            if response.status_code != 200:
                print(f"Resend API Error: {response.text}")
        except Exception as e:
            print(f"Failed to send email via Resend: {e}")

@router.post("/")
async def submit_feedback(feedback: FeedbackModel, background_tasks: BackgroundTasks):
    try:
        entries = load_feedback()
        new_entry = feedback.dict()
        new_entry["timestamp"] = datetime.now().isoformat()
        entries.append(new_entry)
        save_feedback(entries)
        
        if os.getenv("RESEND_API_KEY"):
            background_tasks.add_task(send_email_notification, feedback)
        
        return {"message": "Feedback received successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
