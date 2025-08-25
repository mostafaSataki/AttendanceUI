from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import AttendanceLog, Personnel, User
from schemas import (
    AttendanceLog as AttendanceLogSchema,
    AttendanceLogCreate,
    AttendanceLogManualCreate,
    AttendanceLogUpdate,
    AttendanceLogWithPersonnel,
    AttendanceProcessingRequest,
    AttendanceProcessingResponse
)
from security import get_current_active_user, get_current_active_superuser
from attendance_processor import AttendanceProcessor

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.post("/logs", response_model=List[AttendanceLogSchema], status_code=status.HTTP_201_CREATED)
def create_attendance_logs(
    logs: List[AttendanceLogCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create attendance logs from card number and timestamp data"""
    created_logs = []
    
    for log_data in logs:
        # Find personnel by card number
        personnel = db.query(Personnel).filter(
            Personnel.card_number == log_data.card_number,
            Personnel.is_active == True
        ).first()
        
        if not personnel:
            continue  # Skip if personnel not found
        
        # Create attendance log
        db_log = AttendanceLog(
            personnel_id=personnel.id,
            timestamp=log_data.timestamp,
            device_id=log_data.device_id,
            log_type=log_data.log_type
        )
        db.add(db_log)
        created_logs.append(db_log)
    
    db.commit()
    for log in created_logs:
        db.refresh(log)
    
    return created_logs

@router.post("/logs/manual", response_model=AttendanceLogSchema, status_code=status.HTTP_201_CREATED)
def create_manual_attendance_log(
    log: AttendanceLogManualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a manual attendance log by personnel ID"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(
        Personnel.id == log.personnel_id,
        Personnel.is_active == True
    ).first()
    
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Create attendance log
    db_log = AttendanceLog(
        personnel_id=log.personnel_id,
        timestamp=log.timestamp,
        device_id=log.device_id or "MANUAL",
        log_type=log.log_type,
        is_processed=False
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    return db_log

@router.get("/logs", response_model=List[AttendanceLogWithPersonnel])
def get_attendance_logs(
    skip: int = 0,
    limit: int = 100,
    personnel_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    log_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get attendance logs with filtering options"""
    query = db.query(AttendanceLog)
    
    if personnel_id:
        query = query.filter(AttendanceLog.personnel_id == personnel_id)
    if start_date:
        query = query.filter(AttendanceLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AttendanceLog.timestamp <= end_date)
    if device_id:
        query = query.filter(AttendanceLog.device_id == device_id)
    if log_type:
        query = query.filter(AttendanceLog.log_type == log_type)
    
    logs = query.order_by(AttendanceLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Convert to include personnel info
    result = []
    for log in logs:
        personnel_info = {
            "id": log.personnel.id,
            "card_number": log.personnel.card_number,
            "personnel_number": log.personnel.personnel_number,
            "first_name": log.personnel.first_name,
            "last_name": log.personnel.last_name
        }
        log_dict = log.__dict__
        log_dict['personnel'] = personnel_info
        result.append(log_dict)
    
    return result

@router.get("/logs/{log_id}", response_model=AttendanceLogWithPersonnel)
def get_attendance_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific attendance log"""
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Attendance log not found")
    
    # Include personnel info
    personnel_info = {
        "id": log.personnel.id,
        "card_number": log.personnel.card_number,
        "personnel_number": log.personnel.personnel_number,
        "first_name": log.personnel.first_name,
        "last_name": log.personnel.last_name
    }
    log_dict = log.__dict__
    log_dict['personnel'] = personnel_info
    
    return log_dict

@router.get("/logs/personnel/{personnel_id}", response_model=List[AttendanceLogSchema])
def get_personnel_attendance_logs(
    personnel_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get attendance logs for a specific personnel"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    query = db.query(AttendanceLog).filter(AttendanceLog.personnel_id == personnel_id)
    
    if start_date:
        query = query.filter(AttendanceLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AttendanceLog.timestamp <= end_date)
    
    logs = query.order_by(AttendanceLog.timestamp.desc()).all()
    return logs

@router.get("/logs/personnel/{personnel_id}/{date}", response_model=List[AttendanceLogSchema])
def get_personnel_attendance_logs_by_date(
    personnel_id: int,
    date: str,  # Format: YYYY-MM-DD
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get attendance logs for a specific personnel on a specific date"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Parse date
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get logs for the specific date
    start_datetime = datetime.combine(target_date, datetime.min.time())
    end_datetime = datetime.combine(target_date, datetime.max.time())
    
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.personnel_id == personnel_id,
        AttendanceLog.timestamp >= start_datetime,
        AttendanceLog.timestamp <= end_datetime
    ).order_by(AttendanceLog.timestamp).all()
    
    return logs

@router.put("/logs/{log_id}", response_model=AttendanceLogSchema)
def update_attendance_log(
    log_id: int,
    log_update: AttendanceLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an attendance log"""
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Attendance log not found")
    
    # Update fields
    update_data = log_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)
    
    # Mark as unprocessed so it will be reprocessed
    log.is_processed = False
    
    db.commit()
    db.refresh(log)
    return log

@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Delete an attendance log"""
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Attendance log not found")
    
    db.delete(log)
    db.commit()
    return None

@router.post("/process", response_model=AttendanceProcessingResponse)
def process_attendance(
    request: AttendanceProcessingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    """Process attendance logs and generate daily summaries"""
    processor = AttendanceProcessor(db)
    result = processor.process_attendance(request)
    return result