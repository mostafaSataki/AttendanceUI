from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import MissionType, User
from schemas import (
    MissionType as MissionTypeSchema,
    MissionTypeCreate,
    MissionTypeUpdate
)
from security import get_current_active_user, get_current_active_superuser

router = APIRouter(prefix="/mission-types", tags=["mission-types"])

@router.post("/", response_model=MissionTypeSchema, status_code=status.HTTP_201_CREATED)
def create_mission_type(
    mission_type: MissionTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Create a new mission type"""
    db_mission_type = MissionType(**mission_type.model_dump())
    db.add(db_mission_type)
    db.commit()
    db.refresh(db_mission_type)
    return db_mission_type

@router.get("/", response_model=List[MissionTypeSchema])
def get_mission_types(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all mission types"""
    query = db.query(MissionType)
    if active_only:
        query = query.filter(MissionType.is_active == True)
    mission_types = query.offset(skip).limit(limit).all()
    return mission_types

@router.get("/{mission_type_id}", response_model=MissionTypeSchema)
def get_mission_type(
    mission_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific mission type"""
    mission_type = db.query(MissionType).filter(MissionType.id == mission_type_id).first()
    if not mission_type:
        raise HTTPException(status_code=404, detail="Mission type not found")
    return mission_type

@router.put("/{mission_type_id}", response_model=MissionTypeSchema)
def update_mission_type(
    mission_type_id: int,
    mission_type_update: MissionTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Update a mission type"""
    mission_type = db.query(MissionType).filter(MissionType.id == mission_type_id).first()
    if not mission_type:
        raise HTTPException(status_code=404, detail="Mission type not found")
    
    update_data = mission_type_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mission_type, field, value)
    
    db.commit()
    db.refresh(mission_type)
    return mission_type

@router.delete("/{mission_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission_type(
    mission_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete a mission type"""
    mission_type = db.query(MissionType).filter(MissionType.id == mission_type_id).first()
    if not mission_type:
        raise HTTPException(status_code=404, detail="Mission type not found")
    
    # Check if mission type is used by mission requests
    from models import MissionRequest
    mission_requests = db.query(MissionRequest).filter(MissionRequest.mission_type_id == mission_type_id).first()
    if mission_requests:
        raise HTTPException(status_code=400, detail="Cannot delete mission type that is in use")
    
    db.delete(mission_type)
    db.commit()
    return None

@router.patch("/{mission_type_id}/toggle-active", response_model=MissionTypeSchema)
def toggle_mission_type_active(
    mission_type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Toggle mission type active status"""
    mission_type = db.query(MissionType).filter(MissionType.id == mission_type_id).first()
    if not mission_type:
        raise HTTPException(status_code=404, detail="Mission type not found")
    
    mission_type.is_active = not mission_type.is_active
    db.commit()
    db.refresh(mission_type)
    return mission_type