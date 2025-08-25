from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db
from models import Holiday, Calendar, User
from schemas import Holiday as HolidaySchema, HolidayCreate
from security import get_current_active_user, get_current_active_superuser

router = APIRouter(prefix="/holidays", tags=["holidays"])

@router.get("/", response_model=List[HolidaySchema])
def get_all_holidays(
    skip: int = 0,
    limit: int = 100,
    calendar_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all holidays with optional filtering"""
    query = db.query(Holiday)
    
    if calendar_id:
        query = query.filter(Holiday.calendar_id == calendar_id)
    if start_date:
        query = query.filter(Holiday.date >= start_date)
    if end_date:
        query = query.filter(Holiday.date <= end_date)
    
    holidays = query.order_by(Holiday.date).offset(skip).limit(limit).all()
    return holidays

@router.get("/{holiday_id}", response_model=HolidaySchema)
def get_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific holiday"""
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return holiday

@router.put("/{holiday_id}", response_model=HolidaySchema)
def update_holiday(
    holiday_id: int,
    holiday_update: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Update a holiday"""
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    update_data = holiday_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(holiday, field, value)
    
    db.commit()
    db.refresh(holiday)
    return holiday

@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete a holiday"""
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    db.delete(holiday)
    db.commit()
    return None