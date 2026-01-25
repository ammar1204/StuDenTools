import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

def get_api_key():
    """Retrieve the Gemini API key from environment variables."""
    return os.getenv("GEMINI_API_KEY", "")

ACADEMIC_PROMPT = """You are an academic writing assistant. Your task is to paraphrase the following text in a formal, academic tone.

Guidelines:
- Use formal, scholarly language
- Maintain the original meaning completely
- Use appropriate academic vocabulary
- Avoid colloquialisms and informal expressions
- Use passive voice where appropriate for academic writing
- Ensure clarity and precision
- Do not add new information or opinions
- Keep the same approximate length

Only respond with the paraphrased text, nothing else.

Text to paraphrase:
{text}"""


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
async def paraphrase_text(request: ParaphraseRequest):
    """
    Paraphrase text in an academic tone.
    
    - Input: Text (10-5000 characters)
    - Output: Academically paraphrased text
    - Tone: Formal, scholarly, precise
    """
    
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not set. Please configure your API key."
        )
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = ACADEMIC_PROMPT.format(text=request.text)
        response = model.generate_content(prompt)
        response.resolve()
        
        if not response.candidates:
             raise HTTPException(
                status_code=500,
                detail="The AI model did not return any results. This might be due to safety filters."
            )
            
        try:
            paraphrased = response.text.strip()
        except (ValueError, IndexError, AttributeError):
            if response.candidates and response.candidates[0].content.parts:
                paraphrased = response.candidates[0].content.parts[0].text.strip()
            else:
                raise HTTPException(
                    status_code=500,
                    detail="The AI model returned an empty response or was blocked by safety filters."
                )
        
        original_words = len(request.text.split())
        paraphrased_words = len(paraphrased.split())
        
        return ParaphraseResponse(
            original_text=request.text,
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
async def paraphrase_batch(texts: list[str]):
    """
    Paraphrase multiple texts in academic tone.
    
    - Input: List of texts (max 5 texts, each 10-5000 characters)
    - Output: List of paraphrased texts
    """
    
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not set."
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
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        results = []
        for text in texts:
            prompt = ACADEMIC_PROMPT.format(text=text)
            response = model.generate_content(prompt)
            
            paraphrased = response.text.strip() if response.text else text
            
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
