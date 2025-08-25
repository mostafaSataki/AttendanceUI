from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models import DailySummary, Personnel, User, AttendanceLog
from schemas import (
    DailySummary as DailySummarySchema,
    DailySummaryWithDetails,
    DailySummaryUpdate
)
from security import get_current_active_user, get_current_active_superuser
from attendance_processor import AttendanceProcessor

router = APIRouter(prefix="/daily-summary", tags=["daily-summary"])

@router.get("/{personnel_id}", response_model=List[DailySummaryWithDetails])
def get_daily_summary(
    personnel_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get daily summary for a personnel within a date range"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    query = db.query(DailySummary).filter(DailySummary.personnel_id == personnel_id)
    
    if start_date:
        query = query.filter(DailySummary.date >= start_date)
    if end_date:
        query = query.filter(DailySummary.date <= end_date)
    
    summaries = query.order_by(DailySummary.date.desc()).all()
    
    # Convert to include personnel and shift info
    result = []
    for summary in summaries:
        personnel_info = {
            "id": summary.personnel.id,
            "card_number": summary.personnel.card_number,
            "personnel_number": summary.personnel.personnel_number,
            "first_name": summary.personnel.first_name,
            "last_name": summary.personnel.last_name
        }
        
        shift_info = None
        if summary.shift:
            shift_info = {
                "id": summary.shift.id,
                "name": summary.shift.name,
                "start_time_1": summary.shift.start_time_1,
                "end_time_1": summary.shift.end_time_1
            }
        
        summary_dict = summary.__dict__
        summary_dict['personnel'] = personnel_info
        summary_dict['shift'] = shift_info
        result.append(summary_dict)
    
    return result

@router.get("/{personnel_id}/{date}", response_model=DailySummaryWithDetails)
def get_daily_summary_by_date(
    personnel_id: int,
    target_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get daily summary for a specific personnel and date"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    summary = db.query(DailySummary).filter(
        DailySummary.personnel_id == personnel_id,
        DailySummary.date == target_date
    ).first()
    
    if not summary:
        raise HTTPException(status_code=404, detail="Daily summary not found")
    
    # Include personnel and shift info
    personnel_info = {
        "id": summary.personnel.id,
        "card_number": summary.personnel.card_number,
        "personnel_number": summary.personnel.personnel_number,
        "first_name": summary.personnel.first_name,
        "last_name": summary.personnel.last_name
    }
    
    shift_info = None
    if summary.shift:
        shift_info = {
            "id": summary.shift.id,
            "name": summary.shift.name,
            "start_time_1": summary.shift.start_time_1,
            "end_time_1": summary.shift.end_time_1
        }
    
    summary_dict = summary.__dict__
    summary_dict['personnel'] = personnel_info
    summary_dict['shift'] = shift_info
    
    return summary_dict

@router.put("/{summary_id}", response_model=DailySummarySchema)
def update_daily_summary(
    summary_id: int,
    summary_update: DailySummaryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a daily summary"""
    summary = db.query(DailySummary).filter(DailySummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Daily summary not found")
    
    # Update fields
    update_data = summary_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(summary, field, value)
    
    db.commit()
    db.refresh(summary)
    return summary

@router.post("/reprocess/{personnel_id}/{date}", response_model=dict)
def reprocess_daily_summary(
    personnel_id: int,
    target_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reprocess daily summary for a specific personnel and date"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Check if personnel has work group
    if not personnel.work_group:
        raise HTTPException(status_code=400, detail="Personnel has no work group assigned")
    
    try:
        # Reprocess the specific day
        processor = AttendanceProcessor(db)
        processor._process_personnel_day(
            personnel, 
            personnel.work_group, 
            personnel.work_group.calendar, 
            target_date
        )
        
        return {
            "message": "Daily summary reprocessed successfully",
            "personnel_id": personnel_id,
            "date": target_date.isoformat()
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reprocessing daily summary: {str(e)}"
        )

@router.get("/department/{unit_id}", response_model=List[DailySummaryWithDetails])
def get_department_daily_summary(
    unit_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get daily summary for all personnel in a department"""
    # Get all personnel in the unit
    personnel_list = db.query(Personnel).filter(
        Personnel.unit_id == unit_id,
        Personnel.is_active == True
    ).all()
    
    if not personnel_list:
        return []
    
    personnel_ids = [p.id for p in personnel_list]
    
    # Get daily summaries for these personnel
    query = db.query(DailySummary).filter(
        DailySummary.personnel_id.in_(personnel_ids)
    )
    
    if start_date:
        query = query.filter(DailySummary.date >= start_date)
    if end_date:
        query = query.filter(DailySummary.date <= end_date)
    
    summaries = query.order_by(DailySummary.date.desc()).all()
    
    # Convert to include personnel and shift info
    result = []
    for summary in summaries:
        personnel_info = {
            "id": summary.personnel.id,
            "card_number": summary.personnel.card_number,
            "personnel_number": summary.personnel.personnel_number,
            "first_name": summary.personnel.first_name,
            "last_name": summary.personnel.last_name
        }
        
        shift_info = None
        if summary.shift:
            shift_info = {
                "id": summary.shift.id,
                "name": summary.shift.name,
                "start_time_1": summary.shift.start_time_1,
                "end_time_1": summary.shift.end_time_1
            }
        
        summary_dict = summary.__dict__
        summary_dict['personnel'] = personnel_info
        summary_dict['shift'] = shift_info
        result.append(summary_dict)
    
    return result

@router.get("/statistics/{personnel_id}", response_model=dict)
def get_personnel_attendance_statistics(
    personnel_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get attendance statistics for a personnel"""
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    query = db.query(DailySummary).filter(DailySummary.personnel_id == personnel_id)
    
    if start_date:
        query = query.filter(DailySummary.date >= start_date)
    if end_date:
        query = query.filter(DailySummary.date <= end_date)
    
    summaries = query.all()
    
    if not summaries:
        return {
            "total_days": 0,
            "present_days": 0,
            "absent_days": 0,
            "late_days": 0,
            "total_presence_minutes": 0,
            "total_tardiness_minutes": 0,
            "total_overtime_minutes": 0,
            "average_presence_hours": 0
        }
    
    # Calculate statistics
    total_days = len(summaries)
    present_days = sum(1 for s in summaries if not s.absent and s.status == 'OK')
    absent_days = sum(1 for s in summaries if s.absent)
    late_days = sum(1 for s in summaries if s.tardiness_duration > 0)
    
    total_presence_minutes = sum(s.presence_duration for s in summaries)
    total_tardiness_minutes = sum(s.tardiness_duration for s in summaries)
    total_overtime_minutes = sum(s.overtime_duration for s in summaries)
    
    average_presence_hours = total_presence_minutes / 60 / present_days if present_days > 0 else 0
    
    return {
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "late_days": late_days,
        "total_presence_minutes": total_presence_minutes,
        "total_tardiness_minutes": total_tardiness_minutes,
        "total_overtime_minutes": total_overtime_minutes,
        "average_presence_hours": round(average_presence_hours, 2)
    }