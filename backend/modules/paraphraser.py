import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Rate limiting
from rate_limiter import limiter, RATE_LIMITS
from fastapi import Request

# OpenRouter configuration
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-oss-120b:free"  # Can be changed to any OpenRouter model

def get_openrouter_client():
    """Create and return an OpenRouter client."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return None
    return OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key,
    )



class ParaphraseRequest(BaseModel):
    text: str = Field(
        ..., 
        min_length=10, 
        max_length=5000,
        description="Text to paraphrase (10-5000 characters)"
    )


class ParaphraseResponse(BaseModel):
    original_text: str
    paraphrased_text: str
    original_word_count: int
    paraphrased_word_count: int


@router.post("/api/paraphrase", response_model=ParaphraseResponse)
@limiter.limit(RATE_LIMITS["ai"])
async def paraphrase_text(request: Request, paraphrase_request: ParaphraseRequest):
    """
    Paraphrase text in an academic tone.
    
    - Input: Text (10-5000 characters)
    - Output: Academically paraphrased text
    - Tone: Formal, scholarly, precise
    """
    
    client = get_openrouter_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY environment variable is not set. Please configure your API key."
        )
    
    try:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are an academic writing assistant. Your task is to paraphrase text in a formal, academic tone. Use formal, scholarly language. Maintain the original meaning completely. Use appropriate academic vocabulary. Avoid colloquialisms and informal expressions. Use passive voice where appropriate for academic writing. Ensure clarity and precision. Do not add new information or opinions. Keep the same approximate length. Only respond with the paraphrased text, nothing else."
                },
                {
                    "role": "user",
                    "content": f"Paraphrase the following text:\n\n{paraphrase_request.text}"
                }
            ],
        )
        
        if not response.choices:
            raise HTTPException(
                status_code=500,
                detail="The AI model did not return any results."
            )
        
        paraphrased = response.choices[0].message.content.strip()
        
        if not paraphrased:
            raise HTTPException(
                status_code=500,
                detail="The AI model returned an empty response."
            )
        
        original_words = len(paraphrase_request.text.split())
        paraphrased_words = len(paraphrased.split())
        
        return ParaphraseResponse(
            original_text=paraphrase_request.text,
            paraphrased_text=paraphrased,
            original_word_count=original_words,
            paraphrased_word_count=paraphrased_words
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Paraphrasing failed: {str(e)}"
        )


@router.post("/api/paraphrase/batch")
@limiter.limit(RATE_LIMITS["ai"])
async def paraphrase_batch(request: Request, texts: list[str]):
    """
    Paraphrase multiple texts in academic tone.
    
    - Input: List of texts (max 5 texts, each 10-5000 characters)
    - Output: List of paraphrased texts
    """
    
    client = get_openrouter_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY environment variable is not set."
        )
    
    if len(texts) > 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 texts allowed per batch request."
        )
    
    if len(texts) == 0:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least one text to paraphrase."
        )
    
    for i, text in enumerate(texts):
        if len(text) < 10:
            raise HTTPException(
                status_code=400,
                detail=f"Text {i+1} is too short. Minimum 10 characters required."
            )
        if len(text) > 5000:
            raise HTTPException(
                status_code=400,
                detail=f"Text {i+1} exceeds 5000 character limit."
            )
    
    try:
        results = []
        for text in texts:
            response = client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an academic writing assistant. Paraphrase text in a formal, academic tone. Only respond with the paraphrased text, nothing else."
                    },
                    {
                        "role": "user",
                        "content": f"Paraphrase the following text:\n\n{text}"
                    }
                ],
            )
            
            paraphrased = response.choices[0].message.content.strip() if response.choices else text
            
            results.append({
                "original_text": text,
                "paraphrased_text": paraphrased,
                "original_word_count": len(text.split()),
                "paraphrased_word_count": len(paraphrased.split())
            })
        
        return {"results": results}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch paraphrasing failed: {str(e)}"
        )
