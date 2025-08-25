from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import User
from schemas import Unit, UnitCreate, UnitUpdate, UnitWithChildren
from crud import create_org_unit, get_org_unit_by_id, get_org_units, get_org_units_tree, update_org_unit, delete_org_unit
from security import get_current_active_user

router = APIRouter(prefix="/org-units", tags=["organizational-units"])

@router.post("/", response_model=Unit)
async def create_organizational_unit(
    unit: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new organizational unit
    """
    return create_org_unit(db=db, unit=unit)

@router.get("/", response_model=List[Unit])
async def get_organizational_units(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tree: bool = Query(False, description="Return as tree structure"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all organizational units
    """
    if tree:
        units = get_org_units_tree(db)
        # Convert to response model format
        result = []
        for unit in units:
            unit_dict = {
                "id": unit.id,
                "name": unit.name,
                "description": unit.description,
                "parent_id": unit.parent_id,
                "created_at": unit.created_at,
                "updated_at": unit.updated_at,
                "children": [],
                "personnel_count": len(unit.personnel) if hasattr(unit, 'personnel') else 0
            }
            
            # Add children recursively
            if hasattr(unit, 'children') and unit.children:
                for child in unit.children:
                    child_dict = {
                        "id": child.id,
                        "name": child.name,
                        "description": child.description,
                        "parent_id": child.parent_id,
                        "created_at": child.created_at,
                        "updated_at": child.updated_at,
                        "children": [],
                        "personnel_count": len(child.personnel) if hasattr(child, 'personnel') else 0
                    }
                    unit_dict["children"].append(child_dict)
            
            result.append(unit_dict)
        return result
    else:
        return get_org_units(db, skip=skip, limit=limit)

@router.get("/{unit_id}", response_model=Unit)
async def get_organizational_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific organizational unit
    """
    unit = get_org_unit_by_id(db, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizational unit not found"
        )
    return unit

@router.put("/{unit_id}", response_model=Unit)
async def update_organizational_unit(
    unit_id: int,
    unit_update: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an organizational unit
    """
    unit = update_org_unit(db, unit_id, unit_update.dict(exclude_unset=True))
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizational unit not found"
        )
    return unit

@router.delete("/{unit_id}")
async def delete_organizational_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an organizational unit
    """
    try:
        success = delete_org_unit(db, unit_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organizational unit not found"
            )
        return {"message": "Organizational unit deleted successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )