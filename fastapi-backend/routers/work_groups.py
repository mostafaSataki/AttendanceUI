from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import WorkGroup, WorkGroupShift, Calendar, Shift, User, Personnel
from schemas import (
    WorkGroup as WorkGroupSchema, 
    WorkGroupCreate, 
    WorkGroupUpdate, 
    WorkGroupWithDetails,
    WorkGroupShift as WorkGroupShiftSchema,
    WorkGroupShiftCreate
)
from security import get_current_active_user, get_current_active_superuser

router = APIRouter(prefix="/work-groups", tags=["work-groups"])

@router.post("/", response_model=WorkGroupSchema, status_code=status.HTTP_201_CREATED)
def create_work_group(
    work_group: WorkGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Create a new work group with shift assignments"""
    # Check if calendar exists
    calendar = db.query(Calendar).filter(Calendar.id == work_group.calendar_id).first()
    if not calendar:
        raise HTTPException(status_code=404, detail="Calendar not found")
    
    # Create work group
    work_group_data = work_group.model_dump(exclude={'shift_assignments'})
    db_work_group = WorkGroup(**work_group_data)
    db.add(db_work_group)
    db.commit()
    db.refresh(db_work_group)
    
    # Create shift assignments
    if work_group.shift_assignments:
        for assignment in work_group.shift_assignments:
            # Check if shift exists
            shift = db.query(Shift).filter(Shift.id == assignment['shift_id']).first()
            if not shift:
                db.delete(db_work_group)
                db.commit()
                raise HTTPException(status_code=404, detail=f"Shift with id {assignment['shift_id']} not found")
            
            # Validate day_of_cycle is within repetition period
            if assignment['day_of_cycle'] > work_group.repetition_period_days:
                db.delete(db_work_group)
                db.commit()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Day of cycle {assignment['day_of_cycle']} exceeds repetition period {work_group.repetition_period_days}"
                )
            
            db_assignment = WorkGroupShift(
                work_group_id=db_work_group.id,
                day_of_cycle=assignment['day_of_cycle'],
                shift_id=assignment['shift_id']
            )
            db.add(db_assignment)
        
        db.commit()
    
    return db_work_group

@router.get("/", response_model=List[WorkGroupSchema])
def get_work_groups(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    calendar_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all work groups"""
    query = db.query(WorkGroup)
    
    if active_only:
        query = query.filter(WorkGroup.is_active == True)
    if calendar_id:
        query = query.filter(WorkGroup.calendar_id == calendar_id)
    
    work_groups = query.offset(skip).limit(limit).all()
    return work_groups

@router.get("/{group_id}", response_model=WorkGroupWithDetails)
def get_work_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific work group with details"""
    work_group = db.query(WorkGroup).filter(WorkGroup.id == group_id).first()
    if not work_group:
        raise HTTPException(status_code=404, detail="Work group not found")
    
    # Get shift assignments
    shift_assignments = db.query(WorkGroupShift).filter(
        WorkGroupShift.work_group_id == group_id
    ).order_by(WorkGroupShift.day_of_cycle).all()
    
    # Get personnel count
    personnel_count = db.query(Personnel).filter(
        Personnel.work_group_id == group_id,
        Personnel.is_active == True
    ).count()
    
    return {
        **work_group.__dict__,
        "calendar": work_group.calendar,
        "shift_assignments": shift_assignments,
        "personnel_count": personnel_count
    }

@router.put("/{group_id}", response_model=WorkGroupSchema)
def update_work_group(
    group_id: int,
    work_group_update: WorkGroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Update a work group"""
    work_group = db.query(WorkGroup).filter(WorkGroup.id == group_id).first()
    if not work_group:
        raise HTTPException(status_code=404, detail="Work group not found")
    
    # Update basic fields
    update_data = work_group_update.model_dump(exclude={'shift_assignments'})
    for field, value in update_data.items():
        if value is not None:
            setattr(work_group, field, value)
    
    # Update shift assignments if provided
    if work_group_update.shift_assignments is not None:
        # Remove existing assignments
        db.query(WorkGroupShift).filter(WorkGroupShift.work_group_id == group_id).delete()
        
        # Add new assignments
        for assignment in work_group_update.shift_assignments:
            # Check if shift exists
            shift = db.query(Shift).filter(Shift.id == assignment['shift_id']).first()
            if not shift:
                raise HTTPException(status_code=404, detail=f"Shift with id {assignment['shift_id']} not found")
            
            # Validate day_of_cycle is within repetition period
            if assignment['day_of_cycle'] > work_group.repetition_period_days:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Day of cycle {assignment['day_of_cycle']} exceeds repetition period {work_group.repetition_period_days}"
                )
            
            db_assignment = WorkGroupShift(
                work_group_id=group_id,
                day_of_cycle=assignment['day_of_cycle'],
                shift_id=assignment['shift_id']
            )
            db.add(db_assignment)
    
    db.commit()
    db.refresh(work_group)
    return work_group

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete a work group"""
    work_group = db.query(WorkGroup).filter(WorkGroup.id == group_id).first()
    if not work_group:
        raise HTTPException(status_code=404, detail="Work group not found")
    
    # Check if work group has assigned personnel
    personnel_count = db.query(Personnel).filter(Personnel.work_group_id == group_id).count()
    if personnel_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete work group that has assigned personnel")
    
    # Delete shift assignments first
    db.query(WorkGroupShift).filter(WorkGroupShift.work_group_id == group_id).delete()
    
    # Delete work group
    db.delete(work_group)
    db.commit()
    return None

@router.get("/{group_id}/personnel", response_model=List[dict])
def get_work_group_personnel(
    group_id: int,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get personnel assigned to a work group"""
    work_group = db.query(WorkGroup).filter(WorkGroup.id == group_id).first()
    if not work_group:
        raise HTTPException(status_code=404, detail="Work group not found")
    
    query = db.query(Personnel).filter(Personnel.work_group_id == group_id)
    if active_only:
        query = query.filter(Personnel.is_active == True)
    
    personnel_list = query.all()
    return [
        {
            "id": p.id,
            "card_number": p.card_number,
            "personnel_number": p.personnel_number,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "employment_type": p.employment_type,
            "unit": p.unit.name if p.unit else None
        }
        for p in personnel_list
    ]

@router.patch("/{group_id}/toggle-active", response_model=WorkGroupSchema)
def toggle_work_group_active(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Toggle work group active status"""
    work_group = db.query(WorkGroup).filter(WorkGroup.id == group_id).first()
    if not work_group:
        raise HTTPException(status_code=404, detail="Work group not found")
    
    work_group.is_active = not work_group.is_active
    db.commit()
    db.refresh(work_group)
    return work_group