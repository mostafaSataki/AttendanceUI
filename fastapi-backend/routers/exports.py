from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy import and_
import io
import csv

from database import get_db
from models import DailySummary, Personnel, OrganizationalUnit, LeaveRequest, MissionRequest
from security import get_current_active_user

router = APIRouter(prefix="/exports", tags=["exports"])

# Default template for payroll export
DEFAULT_TEMPLATE = "{personnel_number},{first_name},{last_name},{total_presence_hours},{total_overtime_hours},{total_tardiness_hours},{adjusted_overtime_hours},{total_absent_days},{total_leave_days}"

# Available templates
TEMPLATES = {
    "default": DEFAULT_TEMPLATE,
    "simple": "{personnel_number},{total_presence_hours},{total_overtime_hours}",
    "detailed": "{personnel_number},{first_name},{last_name},{employment_type},{unit_name},{total_presence_hours},{total_overtime_hours},{total_tardiness_hours},{total_undertime_hours},{adjusted_overtime_hours},{total_absent_days},{total_leave_days},{total_mission_days}",
    "payroll": "{personnel_number},{first_name},{last_name},{total_presence_hours}:{total_presence_minutes},{total_overtime_hours}:{total_overtime_minutes},{total_tardiness_hours}:{total_tardiness_minutes}",
    "csv_headers": "Personnel Number,First Name,Last Name,Presence Hours,Overtime Hours,Tardiness Hours,Adjusted Overtime Hours,Absent Days,Leave Days"
}

def apply_template(template: str, data: dict) -> str:
    """Apply a template string to data dictionary"""
    try:
        return template.format(**data)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Template error: Missing key {e}")

@router.get("/payroll")
def export_payroll_data(
    start_date: date = Query(..., description="Start date for the export"),
    end_date: date = Query(..., description="End date for the export"),
    personnel_ids: Optional[List[int]] = Query(None, description="Filter by specific personnel IDs"),
    unit_id: Optional[int] = Query(None, description="Filter by organizational unit"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type"),
    format_template: str = Query("default", description="Template format for export"),
    include_headers: bool = Query(True, description="Include headers in CSV export"),
    delimiter: str = Query(",", description="Delimiter for CSV export"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Export payroll data in various formats"""
    
    # Get the template
    if format_template not in TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Invalid template. Available templates: {list(TEMPLATES.keys())}")
    
    template = TEMPLATES[format_template]
    
    # Build base query for personnel
    personnel_query = db.query(Personnel).filter(Personnel.is_active == True)
    
    if personnel_ids:
        personnel_query = personnel_query.filter(Personnel.id.in_(personnel_ids))
    
    if unit_id:
        personnel_query = personnel_query.filter(Personnel.unit_id == unit_id)
    
    if employment_type:
        personnel_query = personnel_query.filter(Personnel.employment_type == employment_type)
    
    personnel_list = personnel_query.all()
    
    if not personnel_list:
        raise HTTPException(status_code=404, detail="No personnel found for the given criteria")
    
    # Get all daily summaries for the personnel and date range
    personnel_ids_list = [p.id for p in personnel_list]
    
    daily_summaries = db.query(DailySummary).filter(
        and_(
            DailySummary.personnel_id.in_(personnel_ids_list),
            DailySummary.date >= start_date,
            DailySummary.date <= end_date
        )
    ).all()
    
    # Get leave and mission data for the same period
    leave_requests = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.personnel_id.in_(personnel_ids_list),
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
    ).all()
    
    mission_requests = db.query(MissionRequest).filter(
        and_(
            MissionRequest.personnel_id.in_(personnel_ids_list),
            MissionRequest.status == 'approved',
            MissionRequest.start_date <= end_date,
            MissionRequest.end_date >= start_date
        )
    ).all()
    
    # Process data for each personnel
    export_data = []
    
    for personnel in personnel_list:
        # Filter daily summaries for this personnel
        personnel_summaries = [s for s in daily_summaries if s.personnel_id == personnel.id]
        
        # Calculate totals
        presence_minutes = sum(s.presence_duration for s in personnel_summaries)
        tardiness_minutes = sum(s.tardiness_duration for s in personnel_summaries)
        overtime_minutes = sum(s.overtime_duration for s in personnel_summaries)
        undertime_minutes = sum(s.undertime_duration for s in personnel_summaries)
        absent_days = sum(1 for s in personnel_summaries if s.absent)
        
        # Calculate leave and mission days
        personnel_leaves = [l for l in leave_requests if l.personnel_id == personnel.id]
        personnel_missions = [m for m in mission_requests if m.personnel_id == personnel.id]
        
        # Calculate leave days (count only days within the report period)
        leave_days = 0
        for leave in personnel_leaves:
            leave_start = max(leave.start_date, start_date)
            leave_end = min(leave.end_date, end_date)
            if leave_start <= leave_end:
                leave_days += (leave_end - leave_start).days + 1
        
        # Calculate mission days (count only days within the report period)
        mission_days = 0
        for mission in personnel_missions:
            mission_start = max(mission.start_date, start_date)
            mission_end = min(mission.end_date, end_date)
            if mission_start <= mission_end:
                mission_days += (mission_end - mission_start).days + 1
        
        # Calculate adjusted overtime (overtime - undertime)
        adjusted_overtime = max(0, overtime_minutes - undertime_minutes)
        
        # Prepare data for template
        personnel_data = {
            "personnel_id": personnel.id,
            "personnel_number": personnel.personnel_number,
            "first_name": personnel.first_name,
            "last_name": personnel.last_name,
            "card_number": personnel.card_number,
            "employment_type": personnel.employment_type,
            "unit_name": personnel.unit.name if personnel.unit else "",
            "total_presence_minutes": presence_minutes,
            "total_presence_hours": round(presence_minutes / 60, 2),
            "total_tardiness_minutes": tardiness_minutes,
            "total_tardiness_hours": round(tardiness_minutes / 60, 2),
            "total_overtime_minutes": overtime_minutes,
            "total_overtime_hours": round(overtime_minutes / 60, 2),
            "total_undertime_minutes": undertime_minutes,
            "total_undertime_hours": round(undertime_minutes / 60, 2),
            "adjusted_overtime_minutes": adjusted_overtime,
            "adjusted_overtime_hours": round(adjusted_overtime / 60, 2),
            "total_absent_days": absent_days,
            "total_leave_days": leave_days,
            "total_mission_days": mission_days,
            "work_days": len([s for s in personnel_summaries if s.status in ['OK', 'IncompleteLog']])
        }
        
        # Apply template
        try:
            export_line = apply_template(template, personnel_data)
            export_data.append(export_line)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error applying template for personnel {personnel.personnel_number}: {str(e)}")
    
    # Create CSV content
    output = io.StringIO()
    
    # Add headers if requested
    if include_headers and format_template == "csv_headers":
        # Write header row
        writer = csv.writer(output, delimiter=delimiter)
        writer.writerow([
            "Personnel Number", "First Name", "Last Name", "Presence Hours", 
            "Overtime Hours", "Tardiness Hours", "Adjusted Overtime Hours", 
            "Absent Days", "Leave Days"
        ])
        
        # Write data rows using the detailed template
        detailed_template = TEMPLATES["detailed"]
        for personnel in personnel_list:
            # Recalculate data for this personnel (we could optimize this)
            personnel_summaries = [s for s in daily_summaries if s.personnel_id == personnel.id]
            presence_minutes = sum(s.presence_duration for s in personnel_summaries)
            tardiness_minutes = sum(s.tardiness_duration for s in personnel_summaries)
            overtime_minutes = sum(s.overtime_duration for s in personnel_summaries)
            undertime_minutes = sum(s.undertime_duration for s in personnel_summaries)
            absent_days = sum(1 for s in personnel_summaries if s.absent)
            
            personnel_leaves = [l for l in leave_requests if l.personnel_id == personnel.id]
            personnel_missions = [m for m in mission_requests if m.personnel_id == personnel.id]
            
            leave_days = 0
            for leave in personnel_leaves:
                leave_start = max(leave.start_date, start_date)
                leave_end = min(leave.end_date, end_date)
                if leave_start <= leave_end:
                    leave_days += (leave_end - leave_start).days + 1
            
            mission_days = 0
            for mission in personnel_missions:
                mission_start = max(mission.start_date, start_date)
                mission_end = min(mission.end_date, end_date)
                if mission_start <= mission_end:
                    mission_days += (mission_end - mission_start).days + 1
            
            adjusted_overtime = max(0, overtime_minutes - undertime_minutes)
            
            personnel_data = {
                "personnel_number": personnel.personnel_number,
                "first_name": personnel.first_name,
                "last_name": personnel.last_name,
                "employment_type": personnel.employment_type,
                "unit_name": personnel.unit.name if personnel.unit else "",
                "total_presence_hours": round(presence_minutes / 60, 2),
                "total_overtime_hours": round(overtime_minutes / 60, 2),
                "total_tardiness_hours": round(tardiness_minutes / 60, 2),
                "total_undertime_hours": round(undertime_minutes / 60, 2),
                "adjusted_overtime_hours": round(adjusted_overtime / 60, 2),
                "total_absent_days": absent_days,
                "total_leave_days": leave_days,
                "total_mission_days": mission_days
            }
            
            row = [
                personnel_data["personnel_number"],
                personnel_data["first_name"],
                personnel_data["last_name"],
                personnel_data["employment_type"],
                personnel_data["unit_name"],
                personnel_data["total_presence_hours"],
                personnel_data["total_overtime_hours"],
                personnel_data["total_tardiness_hours"],
                personnel_data["total_undertime_hours"],
                personnel_data["adjusted_overtime_hours"],
                personnel_data["total_absent_days"],
                personnel_data["total_leave_days"],
                personnel_data["total_mission_days"]
            ]
            writer.writerow(row)
    else:
        # Write simple text format
        for line in export_data:
            output.write(line + "\n")
    
    # Generate filename
    filename = f"payroll_export_{start_date}_to_{end_date}.csv" if include_headers and format_template == "csv_headers" else f"payroll_export_{start_date}_to_{end_date}.txt"
    
    # Create streaming response
    def iterfile():
        output.seek(0)
        yield from output
    
    # Determine media type
    media_type = "text/csv" if include_headers and format_template == "csv_headers" else "text/plain"
    
    return StreamingResponse(
        iterfile(),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/templates")
def get_available_templates():
    """Get list of available export templates"""
    return {
        "templates": {
            name: {
                "description": f"Template: {template}",
                "example": template.replace("{", "").replace("}", "").split(",")
            }
            for name, template in TEMPLATES.items()
        }
    }

@router.get("/attendance-logs")
def export_attendance_logs(
    start_date: date = Query(..., description="Start date for the export"),
    end_date: date = Query(..., description="End date for the export"),
    personnel_ids: Optional[List[int]] = Query(None, description="Filter by specific personnel IDs"),
    unit_id: Optional[int] = Query(None, description="Filter by organizational unit"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Export raw attendance logs"""
    
    # Build query for personnel
    personnel_query = db.query(Personnel).filter(Personnel.is_active == True)
    
    if personnel_ids:
        personnel_query = personnel_query.filter(Personnel.id.in_(personnel_ids))
    
    if unit_id:
        personnel_query = personnel_query.filter(Personnel.unit_id == unit_id)
    
    personnel_list = personnel_query.all()
    
    if not personnel_list:
        raise HTTPException(status_code=404, detail="No personnel found for the given criteria")
    
    personnel_ids_list = [p.id for p in personnel_list]
    
    # Get attendance logs
    from models import AttendanceLog
    attendance_logs = db.query(AttendanceLog).join(Personnel).filter(
        and_(
            AttendanceLog.personnel_id.in_(personnel_ids_list),
            AttendanceLog.timestamp >= datetime.combine(start_date, datetime.min.time()),
            AttendanceLog.timestamp <= datetime.combine(end_date, datetime.max.time())
        )
    ).order_by(AttendanceLog.timestamp).all()
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow([
        "Personnel Number", "First Name", "Last Name", "Card Number",
        "Timestamp", "Device ID", "Log Type", "Processed"
    ])
    
    # Write data
    for log in attendance_logs:
        writer.writerow([
            log.personnel.personnel_number,
            log.personnel.first_name,
            log.personnel.last_name,
            log.personnel.card_number,
            log.timestamp,
            log.device_id or "",
            log.log_type or "",
            log.is_processed
        ])
    
    # Generate filename
    filename = f"attendance_logs_{start_date}_to_{end_date}.csv"
    
    # Create streaming response
    def iterfile():
        output.seek(0)
        yield from output
    
    return StreamingResponse(
        iterfile(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )