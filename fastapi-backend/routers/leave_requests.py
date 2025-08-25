from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import LeaveRequest, LeaveType, Personnel, User
from schemas import (
    LeaveRequest as LeaveRequestSchema,
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveRequestStatusUpdate,
    LeaveRequestWithDetails
)
from security import get_current_active_user, get_current_active_superuser
from attendance_processor import AttendanceProcessor

router = APIRouter(prefix="/leave-requests", tags=["leave-requests"])

@router.post("/", response_model=LeaveRequestSchema, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    leave_request: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new leave request"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == leave_request.personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Check if leave type exists
    leave_type = db.query(LeaveType).filter(LeaveType.id == leave_request.leave_type_id).first()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")
    
    # Validate date range
    if leave_request.start_date > leave_request.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")
    
    # For hourly leaves, validate time range
    if leave_request.is_hourly:
        if not leave_request.start_time or not leave_request.end_time:
            raise HTTPException(status_code=400, detail="Start and end times are required for hourly leaves")
        if leave_request.start_time >= leave_request.end_time:
            raise HTTPException(status_code=400, detail="Start time cannot be after end time")
    
    # Check for overlapping leave requests
    existing_request = db.query(LeaveRequest).filter(
        LeaveRequest.personnel_id == leave_request.personnel_id,
        LeaveRequest.status.in_(['pending', 'approved']),
        LeaveRequest.start_date <= leave_request.end_date,
        LeaveRequest.end_date >= leave_request.start_date
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Overlapping leave request exists")
    
    # Create leave request
    db_leave_request = LeaveRequest(**leave_request.model_dump())
    db.add(db_leave_request)
    db.commit()
    db.refresh(db_leave_request)
    return db_leave_request

@router.get("/", response_model=List[LeaveRequestWithDetails])
def get_leave_requests(
    skip: int = 0,
    limit: int = 100,
    personnel_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get leave requests with filtering options"""
    query = db.query(LeaveRequest)
    
    if personnel_id:
        query = query.filter(LeaveRequest.personnel_id == personnel_id)
    if status:
        query = query.filter(LeaveRequest.status == status)
    if start_date:
        query = query.filter(LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.filter(LeaveRequest.end_date <= end_date)
    
    leave_requests = query.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    # Convert to include details
    result = []
    for request in leave_requests:
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
        request_dict['leave_type'] = request.leave_type
        request_dict['approver'] = approver_info
        result.append(request_dict)
    
    return result

@router.get("/{request_id}", response_model=LeaveRequestWithDetails)
def get_leave_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific leave request"""
    request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
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
    request_dict['leave_type'] = request.leave_type
    request_dict['approver'] = approver_info
    
    return request_dict

@router.put("/{request_id}", response_model=LeaveRequestSchema)
def update_leave_request(
    request_id: int,
    leave_request_update: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a leave request"""
    request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    # Only allow updates if status is pending
    if request.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only update pending requests")
    
    # Update fields
    update_data = leave_request_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(request, field, value)
    
    db.commit()
    db.refresh(request)
    return request

@router.put("/{request_id}/status", response_model=LeaveRequestSchema)
def update_leave_request_status(
    request_id: int,
    status_update: LeaveRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update leave request status (approve/reject)"""
    request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
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
    
    # If status changed to approved, reprocess attendance for the leave period
    if original_status != 'approved' and status_update.status == 'approved':
        try:
            processor = AttendanceProcessor(db)
            from schemas import AttendanceProcessingRequest
            
            # Reprocess for the leave period
            processing_request = AttendanceProcessingRequest(
                start_date=request.start_date,
                end_date=request.end_date,
                personnel_ids=[request.personnel_id],
                force_reprocess=True
            )
            
            processor.process_attendance(processing_request)
            
        except Exception as e:
            # Log error but don't fail the status update
            print(f"Error reprocessing attendance after leave approval: {e}")
    
    return request

@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a leave request"""
    request = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    # Only allow deletion if status is pending
    if request.status != 'pending':
        raise HTTPException(status_code=400, detail="Can only delete pending requests")
    
    db.delete(request)
    db.commit()
    return None

@router.get("/personnel/{personnel_id}", response_model=List[LeaveRequestWithDetails])
def get_personnel_leave_requests(
    personnel_id: int,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get leave requests for a specific personnel"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    query = db.query(LeaveRequest).filter(LeaveRequest.personnel_id == personnel_id)
    
    if status:
        query = query.filter(LeaveRequest.status == status)
    if start_date:
        query = query.filter(LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.filter(LeaveRequest.end_date <= end_date)
    
    leave_requests = query.order_by(LeaveRequest.created_at.desc()).all()
    
    # Convert to include details
    result = []
    for request in leave_requests:
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
        request_dict['leave_type'] = request.leave_type
        request_dict['approver'] = approver_info
        result.append(request_dict)
    
    return result