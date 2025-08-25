from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models import Calendar, Holiday, User
from schemas import Calendar as CalendarSchema, CalendarCreate, CalendarUpdate, Holiday as HolidaySchema, HolidayCreate
from security import get_current_active_user, get_current_active_superuser

router = APIRouter(prefix="/calendars", tags=["calendars"])

# Calendar endpoints
@router.post("/", response_model=CalendarSchema, status_code=status.HTTP_201_CREATED)
def create_calendar(
    calendar: CalendarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Create a new calendar"""
    db_calendar = Calendar(**calendar.model_dump())
    db.add(db_calendar)
    db.commit()
    db.refresh(db_calendar)
    return db_calendar

@router.get("/", response_model=List[CalendarSchema])
def get_calendars(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all calendars"""
    query = db.query(Calendar)
    if active_only:
        query = query.filter(Calendar.is_active == True)
    calendars = query.offset(skip).limit(limit).all()
    return calendars

@router.get("/{calendar_id}", response_model=CalendarSchema)
def get_calendar(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific calendar"""
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    return calendar

@router.put("/{calendar_id}", response_model=CalendarSchema)
def update_calendar(
    calendar_id: int,
    calendar_update: CalendarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Update a calendar"""
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    update_data = calendar_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(calendar, field, value)
    
    db.commit()
    db.refresh(calendar)
    return calendar

@router.delete("/{calendar_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar(
    calendar_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete a calendar"""
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    # Check if calendar is used by work groups
    work_groups = db.query(Calendar).filter(Calendar.calendar_id == calendar_id).first()
    if work_groups:
        raise HTTPException(status_code=400, detail="Cannot delete calendar that is in use by work groups")
    
    db.delete(calendar)
    db.commit()
    return None

# Holiday endpoints
@router.post("/{calendar_id}/holidays", response_model=List[HolidaySchema], status_code=status.HTTP_201_CREATED)
def create_holidays(
    calendar_id: int,
    holidays: List[HolidayCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Create multiple holidays for a calendar"""
    # Check if calendar exists
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    # Create holidays
    db_holidays = []
    for holiday_data in holidays:
        holiday_dict = holiday_data.model_dump()
        holiday_dict['calendar_id'] = calendar_id
        db_holiday = Holiday(**holiday_dict)
        db.add(db_holiday)
        db_holidays.append(db_holiday)
    
    db.commit()
    for holiday in db_holidays:
        db.refresh(holiday)
    
    return db_holidays

@router.get("/{calendar_id}/holidays", response_model=List[HolidaySchema])
def get_calendar_holidays(
    calendar_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get holidays for a specific calendar"""
    # Check if calendar exists
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    query = db.query(Holiday).filter(Holiday.calendar_id == calendar_id)
    
    if start_date:
        query = query.filter(Holiday.date >= start_date)
    if end_date:
        query = query.filter(Holiday.date <= end_date)
    
    holidays = query.order_by(Holiday.date).all()
    return holidays

@router.get("/{calendar_id}/holidays-with-calendar", response_model=dict)
def get_calendar_with_holidays(
    calendar_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get calendar with its holidays"""
    calendar = db.query(Calendar).filter(Calendar.id == calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    query = db.query(Holiday).filter(Holiday.calendar_id == calendar_id)
    
    if start_date:
        query = query.filter(Holiday.date >= start_date)
    if end_date:
        query = query.filter(Holiday.date <= end_date)
    
    holidays = query.order_by(Holiday.date).all()
    
    return {
        "calendar": calendar,
        "holidays": holidays
    }