from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import User, WorkGroup
from schemas import Personnel, PersonnelCreate, PersonnelUpdate, PersonnelWithUnit, PersonnelWorkGroupAssignment
from crud import (
    create_personnel, get_personnel_by_id, get_personnel_list, 
    update_personnel, delete_personnel, get_personnel_by_card_number,
    get_personnel_by_personnel_number
)
from security import get_current_active_user

router = APIRouter(prefix="/personnel", tags=["personnel"])

@router.post("/", response_model=Personnel)
async def create_personnel_record(
    personnel: PersonnelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new personnel record
    """
    # Check if card number already exists
    existing_card = get_personnel_by_card_number(db, personnel.card_number)
    if existing_card:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card number already exists"
        )
    
    # Check if personnel number already exists
    existing_personnel = get_personnel_by_personnel_number(db, personnel.personnel_number)
    if existing_personnel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Personnel number already exists"
        )
    
    return create_personnel(db=db, personnel=personnel)

@router.get("/", response_model=List[PersonnelWithUnit])
async def get_personnel_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    unit_id: Optional[int] = Query(None, description="Filter by organizational unit"),
    search: Optional[str] = Query(None, description="Search by name, card number, or personnel number"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get personnel list with filtering options
    """
    personnel_list = get_personnel_list(
        db=db,
        skip=skip,
        limit=limit,
        unit_id=unit_id,
        search=search,
        is_active=is_active
    )
    
    # Convert to PersonnelWithUnit format
    result = []
    for person in personnel_list:
        person_dict = {
            "id": person.id,
            "card_number": person.card_number,
            "personnel_number": person.personnel_number,
            "first_name": person.first_name,
            "last_name": person.last_name,
            "start_date": person.start_date,
            "end_date": person.end_date,
            "employment_type": person.employment_type,
            "unit_id": person.unit_id,
            "is_active": person.is_active,
            "created_at": person.created_at,
            "updated_at": person.updated_at,
            "unit": {
                "id": person.unit.id,
                "name": person.unit.name,
                "description": person.unit.description,
                "parent_id": person.unit.parent_id,
                "created_at": person.unit.created_at,
                "updated_at": person.unit.updated_at
            }
        }
        result.append(person_dict)
    
    return result

@router.get("/{personnel_id}", response_model=PersonnelWithUnit)
async def get_personnel_details(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get detailed information about a specific personnel
    """
    personnel = get_personnel_by_id(db, personnel_id)
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    
    # Convert to PersonnelWithUnit format
    return {
        "id": personnel.id,
        "card_number": personnel.card_number,
        "personnel_number": personnel.personnel_number,
        "first_name": personnel.first_name,
        "last_name": personnel.last_name,
        "start_date": personnel.start_date,
        "end_date": personnel.end_date,
        "employment_type": personnel.employment_type,
        "unit_id": personnel.unit_id,
        "is_active": personnel.is_active,
        "created_at": personnel.created_at,
        "updated_at": personnel.updated_at,
        "unit": {
            "id": personnel.unit.id,
            "name": personnel.unit.name,
            "description": personnel.unit.description,
            "parent_id": personnel.unit.parent_id,
            "created_at": personnel.unit.created_at,
            "updated_at": personnel.unit.updated_at
        }
    }

@router.put("/{personnel_id}", response_model=Personnel)
async def update_personnel_record(
    personnel_id: int,
    personnel_update: PersonnelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update personnel information
    """
    # Check if personnel exists
    existing_personnel = get_personnel_by_id(db, personnel_id)
    if not existing_personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    
    # Check for duplicate card number if being updated
    if personnel_update.card_number and personnel_update.card_number != existing_personnel.card_number:
        existing_card = get_personnel_by_card_number(db, personnel_update.card_number)
        if existing_card:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Card number already exists"
            )
    
    # Check for duplicate personnel number if being updated
    if personnel_update.personnel_number and personnel_update.personnel_number != existing_personnel.personnel_number:
        existing_number = get_personnel_by_personnel_number(db, personnel_update.personnel_number)
        if existing_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Personnel number already exists"
            )
    
    updated_personnel = update_personnel(db, personnel_id, personnel_update.dict(exclude_unset=True))
    return updated_personnel

@router.delete("/{personnel_id}")
async def delete_personnel_record(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete (deactivate) a personnel record
    """
    success = delete_personnel(db, personnel_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    
    return {"message": "Personnel record deactivated successfully"}

@router.put("/{personnel_id}/assign-work-group", response_model=dict)
async def assign_work_group(
    personnel_id: int,
    assignment: PersonnelWorkGroupAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Assign a work group to a personnel
    """
    # Check if personnel exists
    personnel = get_personnel_by_id(db, personnel_id)
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    
    # Check if work group exists
    work_group = db.query(WorkGroup).filter(WorkGroup.id == assignment.work_group_id).first()
    if not work_group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work group not found"
        )
    
    # Update personnel work group
    personnel.work_group_id = assignment.work_group_id
    db.commit()
    db.refresh(personnel)
    
    return {
        "message": "Work group assigned successfully",
        "personnel_id": personnel_id,
        "work_group_id": assignment.work_group_id,
        "work_group_name": work_group.name
    }

@router.put("/{personnel_id}/remove-work-group", response_model=dict)
async def remove_work_group(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove work group assignment from a personnel
    """
    # Check if personnel exists
    personnel = get_personnel_by_id(db, personnel_id)
    if not personnel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personnel not found"
        )
    
    # Remove work group assignment
    personnel.work_group_id = None
    db.commit()
    db.refresh(personnel)
    
    return {
        "message": "Work group assignment removed successfully",
        "personnel_id": personnel_id
    }