from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Shift, User
from schemas import Shift as ShiftSchema, ShiftCreate, ShiftUpdate
from security import get_current_active_user, get_current_active_superuser

router = APIRouter(prefix="/shifts", tags=["shifts"])

@router.post("/", response_model=ShiftSchema, status_code=status.HTTP_201_CREATED)
def create_shift(
    shift: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Create a new work shift"""
    db_shift = Shift(**shift.model_dump())
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@router.get("/", response_model=List[ShiftSchema])
def get_shifts(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all work shifts"""
    query = db.query(Shift)
    if active_only:
        query = query.filter(Shift.is_active == True)
    shifts = query.offset(skip).limit(limit).all()
    return shifts

@router.get("/{shift_id}", response_model=ShiftSchema)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific work shift"""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift

@router.put("/{shift_id}", response_model=ShiftSchema)
def update_shift(
    shift_id: int,
    shift_update: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Update a work shift"""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    update_data = shift_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shift, field, value)
    
    db.commit()
    db.refresh(shift)
    return shift

@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete a work shift"""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check if shift is used by work groups
    from models import WorkGroupShift
    work_group_shifts = db.query(WorkGroupShift).filter(WorkGroupShift.shift_id == shift_id).first()
    if work_group_shifts:
        raise HTTPException(status_code=400, detail="Cannot delete shift that is in use by work groups")
    
    db.delete(shift)
    db.commit()
    return None

@router.patch("/{shift_id}/toggle-active", response_model=ShiftSchema)
def toggle_shift_active(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Toggle shift active status"""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift.is_active = not shift.is_active
    db.commit()
    db.refresh(shift)
    return shift