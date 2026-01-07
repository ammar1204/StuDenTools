from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class Course(BaseModel):
    name: Optional[str] = Field(default=None, description="Course name (optional)")
    grade: str = Field(..., description="Letter grade (A, B, C, D, E, F)")
    credits: float = Field(..., gt=0, description="Credit hours for the course")


class GPARequest(BaseModel):
    courses: List[Course] = Field(..., min_length=1, description="List of courses")
    scale_type: str = Field(default="4.0", description="GPA scale: '4.0' or '5.0'")


class GPAResponse(BaseModel):
    gpa: float
    total_credits: float
    total_courses: int
    scale_type: str


SCALE_4_0 = {
    "A": 4.0,
    "B": 3.0,
    "C": 2.0,
    "D": 1.0,
    "F": 0.0
}

SCALE_5_0 = {
    "A": 5.0,
    "B": 4.0,
    "C": 3.0,
    "D": 2.0,
    "E": 1.0,
    "F": 0.0
}


def get_grade_points(grade: str, scale: dict) -> float:
    """Retrieve points for a grade from the given scale."""
    return scale.get(grade.upper(), 0.0)


def calculate_gpa(request: GPARequest) -> dict:
    """Calculate GPA based on the provided courses and scale type."""
    if not request.courses:
        return {"gpa": 0.0, "total_credits": 0.0, "total_courses": 0, "scale_type": request.scale_type}

    scale_map = SCALE_5_0 if request.scale_type == "5.0" else SCALE_4_0
    
    total_points = 0.0
    total_credits = 0.0

    for course in request.courses:
        points = get_grade_points(course.grade, scale_map)
        total_points += points * course.credits
        total_credits += course.credits

    gpa = 0.0
    if total_credits > 0:
        gpa = round(total_points / total_credits, 2)

    return {
        "gpa": gpa,
        "total_credits": total_credits,
        "total_courses": len(request.courses),
        "scale_type": request.scale_type
    }


@router.post("/api/gpa", response_model=GPAResponse)
async def calculate_gpa_endpoint(request: GPARequest):
    """
    Calculate GPA based on courses and grades.
    
    - scale_type: "4.0" (default) or "5.0"
    - Supports letter grades: A, B, C, D, E, F
    
    Example request:
    ```json
    {
        "courses": [
            {"name": "Math", "grade": "A", "credits": 3},
            {"name": "English", "grade": "B+", "credits": 3}
        ],
        "scale_type": "4.0"
    }
    ```
    """
    try:
        result = calculate_gpa(request)
        return GPAResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"GPA calculation failed: {str(e)}"
        )


@router.get("/api/gpa/scales")
async def get_grade_scales():
    """
    Get the available GPA scales and their grade point mappings.
    """
    return {
        "scales": {
            "4.0": SCALE_4_0,
            "5.0": SCALE_5_0
        },
        "available_grades": list(SCALE_4_0.keys())
    }
