from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import LeaveType, User
from schemas import (
    LeaveType as LeaveTypeSchema,
    LeaveTypeCreate,
    LeaveTypeUpdate
)
from security import get_current_active_user, get_current_active_superuser

router = APIRouter(prefix="/leave-types", tags=["leave-types"])

@router.post("/", response_model=LeaveTypeSchema, status_code=status.HTTP_201_CREATED)
def create_leave_type(
    leave_type: LeaveTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Create a new leave type"""
    db_leave_type = LeaveType(**leave_type.model_dump())
    db.add(db_leave_type)
    db.commit()
    db.refresh(db_leave_type)
    return db_leave_type

@router.get("/", response_model=List[LeaveTypeSchema])
def get_leave_types(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all leave types"""
    query = db.query(LeaveType)
    if active_only:
        query = query.filter(LeaveType.is_active == True)
    leave_types = query.offset(skip).limit(limit).all()
    return leave_types

@router.get("/{leave_type_id}", response_model=LeaveTypeSchema)
def get_leave_type(
    leave_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific leave type"""
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    return leave_type

@router.put("/{leave_type_id}", response_model=LeaveTypeSchema)
def update_leave_type(
    leave_type_id: int,
    leave_type_update: LeaveTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Update a leave type"""
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    update_data = leave_type_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(leave_type, field, value)
    
    db.commit()
    db.refresh(leave_type)
    return leave_type

@router.delete("/{leave_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_type(
    leave_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete a leave type"""
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    # Check if leave type is used by leave requests
    from models import LeaveRequest
    leave_requests = db.query(LeaveRequest).filter(LeaveRequest.leave_type_id == leave_type_id).first()
    if leave_requests:
        raise HTTPException(status_code=400, detail="Cannot delete leave type that is in use")
    
    db.delete(leave_type)
    db.commit()
    return None

@router.patch("/{leave_type_id}/toggle-active", response_model=LeaveTypeSchema)
def toggle_leave_type_active(
    leave_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Toggle leave type active status"""
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    leave_type.is_active = not leave_type.is_active
    db.commit()
    db.refresh(leave_type)
    return leave_type