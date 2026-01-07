from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import random

router = APIRouter(
    prefix="/auto-timetable",
    tags=["Auto Timetable"]
)

class CourseRequest(BaseModel):
    name: str
    duration: int  # in hours
    preferred_days: Optional[List[str]] = []

class FreePeriod(BaseModel):
    day: str
    start_time: str
    end_time: str

class FixedEvent(BaseModel):
    name: str
    day: str
    start_time: str
    end_time: str

class TimeConstraints(BaseModel):
    start_time: str = "08:00"
    end_time: str = "18:00"
    free_periods: List[FreePeriod] = []

class Preferences(BaseModel):
    compact_schedule: bool = False
    preferred_days: Optional[List[str]] = []
    max_hours_per_day: Optional[int] = None
    min_break_duration: Optional[int] = None
    max_session_duration: Optional[int] = None

class GenerateRequest(BaseModel):
    courses: List[CourseRequest]
    constraints: TimeConstraints
    fixed_events: List[FixedEvent] = []
    preferences: Preferences

class TimetableEntry(BaseModel):
    course_name: str
    day: str
    start_time: str
    end_time: str
    color: str

class GenerateResponse(BaseModel):
    timetable: List[TimetableEntry]
    success: bool
    message: str

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

def time_str_to_int(time_str: str) -> int:
    """Converts 'HH:MM' to integer hour."""
    return int(time_str.split(':')[0])

def int_to_time_str(hour: int) -> str:
    """Converts integer hour to 'HH:MM'."""
    return f"{hour:02d}:00"

@router.post("/generate", response_model=GenerateResponse)
async def generate_timetable(request: GenerateRequest):
    courses = request.courses
    constraints = request.constraints
    
    start_hour = time_str_to_int(constraints.start_time)
    end_hour = time_str_to_int(constraints.end_time)
    
    total_hours = end_hour - start_hour
    if total_hours <= 0:
        raise HTTPException(status_code=400, detail="End time must be after start time")
        
    grid = [[None for _ in range(total_hours)] for _ in range(len(DAYS))]

    for fp in constraints.free_periods:
        if fp.day in DAYS:
            day_idx = DAYS.index(fp.day)
            fp_start = time_str_to_int(fp.start_time)
            fp_end = time_str_to_int(fp.end_time)
            
            fp_start_idx = fp_start - start_hour
            fp_end_idx = fp_end - start_hour
            
            for h in range(fp_start_idx, fp_end_idx):
                if 0 <= h < total_hours:
                    grid[day_idx][h] = "FREE_TIME"

    for fe in request.fixed_events:
        if fe.day in DAYS:
            day_idx = DAYS.index(fe.day)
            fe_start = time_str_to_int(fe.start_time)
            fe_end = time_str_to_int(fe.end_time)
            
            fe_start_idx = fe_start - start_hour
            fe_end_idx = fe_end - start_hour
            
            for h in range(fe_start_idx, fe_end_idx):
                if 0 <= h < total_hours:
                    grid[day_idx][h] = fe.name

    processed_courses = []
    
    for course in courses:
        if request.preferences.max_session_duration and course.duration > request.preferences.max_session_duration:
            duration = course.duration
            max_dur = request.preferences.max_session_duration
            while duration > 0:
                chunk_dur = min(duration, max_dur)
                processed_courses.append(CourseRequest(
                    name=course.name,
                    duration=chunk_dur,
                    preferred_days=course.preferred_days
                ))
                duration -= chunk_dur
        else:
            processed_courses.append(course)

    sorted_courses = sorted(processed_courses, key=lambda c: c.duration, reverse=True)
    
    assignments = {}

    def is_safe(course, day_idx, start_h_idx):
        if start_h_idx + course.duration > total_hours:
            return False

        for h in range(start_h_idx, start_h_idx + course.duration):
            if grid[day_idx][h] is not None:
                return False

        if course.preferred_days and DAYS[day_idx] not in course.preferred_days:
            return False

        if request.preferences.max_session_duration:
            for h in range(total_hours):
                if grid[day_idx][h] == course.name:
                    return False

        if request.preferences.max_hours_per_day:
            current_hours = sum(
                1 for h in range(total_hours)
                if grid[day_idx][h] is not None and grid[day_idx][h] != "FREE_TIME"
            )
            if current_hours + course.duration > request.preferences.max_hours_per_day:
                return False
            
        return True

    def solve(course_idx):
        if course_idx == len(sorted_courses):
            return True
            
        course = sorted_courses[course_idx]
        
        day_indices = list(range(len(DAYS)))
        random.shuffle(day_indices)

        if course.preferred_days:
            pref_indices = [i for i in day_indices if DAYS[i] in course.preferred_days]
            other_indices = [i for i in day_indices if DAYS[i] not in course.preferred_days]
            day_indices = pref_indices + other_indices

        for d_idx in day_indices:
            hour_indices = list(range(total_hours))
            random.shuffle(hour_indices)
            
            for h_idx in hour_indices:
                if is_safe(course, d_idx, h_idx):
                    for h in range(h_idx, h_idx + course.duration):
                        grid[d_idx][h] = course.name
                    assignments[course_idx] = (d_idx, h_idx)
                    
                    if solve(course_idx + 1):
                        return True

                    for h in range(h_idx, h_idx + course.duration):
                        grid[d_idx][h] = None
                    del assignments[course_idx]
                    
        return False

    if solve(0):
        timetable = []
        for i, course in enumerate(sorted_courses):
            if i in assignments:
                d_idx, h_idx = assignments[i]
                
                real_start_hour = start_hour + h_idx
                real_end_hour = real_start_hour + course.duration
                
                timetable.append(TimetableEntry(
                    course_name=course.name,
                    day=DAYS[d_idx],
                    start_time=int_to_time_str(real_start_hour),
                    end_time=int_to_time_str(real_end_hour),
                    color=COLORS[i % len(COLORS)]
                ))
        
        for fe in request.fixed_events:
             timetable.append(TimetableEntry(
                course_name=fe.name,
                day=fe.day,
                start_time=fe.start_time,
                end_time=fe.end_time,
                color='#6b7280'
            ))

        return GenerateResponse(timetable=timetable, success=True, message="Timetable generated successfully")
    else:
        return GenerateResponse(timetable=[], success=False, message="Could not generate a valid timetable with given constraints")
