from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import MissionRequest, MissionType, Personnel, User
from schemas import (
    MissionRequest as MissionRequestSchema,
    MissionRequestCreate,
    MissionRequestUpdate,
    MissionRequestStatusUpdate,
    MissionRequestWithDetails
)
from security import get_current_active_user, get_current_active_superuser
from attendance_processor import AttendanceProcessor

router = APIRouter(prefix="/mission-requests", tags=["mission-requests"])

@router.post("/", response_model=MissionRequestSchema, status_code=status.HTTP_201_CREATED)
def create_mission_request(
    mission_request: MissionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new mission request"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == mission_request.personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Check if mission type exists
    mission_type = db.query(MissionType).filter(MissionType.id == mission_request.mission_type_id).first()
    if not mission_type:
        raise HTTPException(status_code=404, detail="Mission type not found")
    
    # Validate date range
    if mission_request.start_date > mission_request.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")
    
    # For hourly missions, validate time range
    if mission_request.is_hourly:
        if not mission_request.start_time or not mission_request.end_time:
            raise HTTPException(status_code=400, detail="Start and end times are required for hourly missions")
        if mission_request.start_time >= mission_request.end_time:
            raise HTTPException(status_code=400, detail="Start time cannot be after end time")
    
    # Check for overlapping mission requests
    existing_request = db.query(MissionRequest).filter(
        MissionRequest.personnel_id == mission_request.personnel_id,
        MissionRequest.status.in_(['pending', 'approved']),
        MissionRequest.start_date <= mission_request.end_date,
        MissionRequest.end_date >= mission_request.start_date
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Overlapping mission request exists")
    
    # Create mission request
    db_mission_request = MissionRequest(**mission_request.model_dump())
    db.add(db_mission_request)
    db.commit()
    db.refresh(db_mission_request)
    return db_mission_request

@router.get("/", response_model=List[MissionRequestWithDetails])
def get_mission_requests(
    skip: int = 0,
    limit: int = 100,
    personnel_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get mission requests with filtering options"""
    query = db.query(MissionRequest)
    
    if personnel_id:
        query = query.filter(MissionRequest.personnel_id == personnel_id)
    if status:
        query = query.filter(MissionRequest.status == status)
    if start_date:
        query = query.filter(MissionRequest.start_date >= start_date)
    if end_date:
        query = query.filter(MissionRequest.end_date <= end_date)
    
    mission_requests = query.order_by(MissionRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert to include details
    result = []
    for request in mission_requests:
        personnel_info = {
            "id": request.personnel.id,
            "card_number": request.personnel.card_number,
            "personnel_number": request.personnel.personnel_number,
            "first_name": request.personnel.first_name,
            "last_name": request.personnel.last_name
        }
        
        approver_info = None
        if request.approver:
            approver_info = {
                "id": request.approver.id,
                "email": request.approver.email
            }
        
        request_dict = request.__dict__
        request_dict['personnel'] = personnel_info
        request_dict['mission_type'] = request.mission_type
        request_dict['approver'] = approver_info
        result.append(request_dict)
    
    return result

@router.get("/{request_id}", response_model=MissionRequestWithDetails)
def get_mission_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific mission request"""
    request = db.query(MissionRequest).filter(MissionRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mission request not found")
    
    # Include details
    personnel_info = {
        "id": request.personnel.id,
        "card_number": request.personnel.card_number,
        "personnel_number": request.personnel.personnel_number,
        "first_name": request.personnel.first_name,
        "last_name": request.personnel.last_name
    }
    
    approver_info = None
    if request.approver:
        approver_info = {
            "id": request.approver.id,
            "email": request.approver.email
        }
    
    request_dict = request.__dict__
    request_dict['personnel'] = personnel_info
    request_dict['mission_type'] = request.mission_type
    request_dict['approver'] = approver_info
    
    return request_dict

@router.put("/{request_id}", response_model=MissionRequestSchema)
def update_mission_request(
    request_id: int,
    mission_request_update: MissionRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a mission request"""
    request = db.query(MissionRequest).filter(MissionRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mission request not found")
    
    # Only allow updates if status is pending
    if request.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only update pending requests")
    
    # Update fields
    update_data = mission_request_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(request, field, value)
    
    db.commit()
    db.refresh(request)
    return request

@router.put("/{request_id}/status", response_model=MissionRequestSchema)
def update_mission_request_status(
    request_id: int,
    status_update: MissionRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update mission request status (approve/reject)"""
    request = db.query(MissionRequest).filter(MissionRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mission request not found")
    
    # Only allow status updates if current status is pending
    if request.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only update status of pending requests")
    
    # Validate status
    if status_update.status not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    # Store original status for comparison
    original_status = request.status
    
    # Update status and approver info
    request.status = status_update.status
    request.approver_notes = status_update.approver_notes
    request.approved_by = current_user.id
    request.approved_at = datetime.now()
    
    db.commit()
    db.refresh(request)
    
    # If status changed to approved, reprocess attendance for the mission period
    if original_status != 'approved' and status_update.status == 'approved':
        try:
            processor = AttendanceProcessor(db)
            from schemas import AttendanceProcessingRequest
            
            # Reprocess for the mission period
            processing_request = AttendanceProcessingRequest(
                start_date=request.start_date,
                end_date=request.end_date,
                personnel_ids=[request.personnel_id],
                force_reprocess=True
            )
            
            processor.process_attendance(processing_request)
            
        except Exception as e:
            # Log error but don't fail the status update
            print(f"Error reprocessing attendance after mission approval: {e}")
    
    return request

@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a mission request"""
    request = db.query(MissionRequest).filter(MissionRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Mission request not found")
    
    # Only allow deletion if status is pending
    if request.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only delete pending requests")
    
    db.delete(request)
    db.commit()
    return None

@router.get("/personnel/{personnel_id}", response_model=List[MissionRequestWithDetails])
def get_personnel_mission_requests(
    personnel_id: int,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get mission requests for a specific personnel"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    query = db.query(MissionRequest).filter(MissionRequest.personnel_id == personnel_id)
    
    if status:
        query = query.filter(MissionRequest.status == status)
    if start_date:
        query = query.filter(MissionRequest.start_date >= start_date)
    if end_date:
        query = query.filter(MissionRequest.end_date <= end_date)
    
    mission_requests = query.order_by(MissionRequest.created_at.desc()).all()
    
    # Convert to include details
    result = []
    for request in mission_requests:
        personnel_info = {
            "id": request.personnel.id,
            "card_number": request.personnel.card_number,
            "personnel_number": request.personnel.personnel_number,
            "first_name": request.personnel.first_name,
            "last_name": request.personnel.last_name
        }
        
        approver_info = None
        if request.approver:
            approver_info = {
                "id": request.approver.id,
                "email": request.approver.email
            }
        
        request_dict = request.__dict__
        request_dict['personnel'] = personnel_info
        request_dict['mission_type'] = request.mission_type
        request_dict['approver'] = approver_info
        result.append(request_dict)
    
    return result