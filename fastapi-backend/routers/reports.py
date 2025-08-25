from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy import func, and_

from database import get_db
from models import DailySummary, Personnel, OrganizationalUnit, LeaveRequest, MissionRequest, AttendanceLog
from security import get_current_active_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/summary")
def get_periodic_summary(
    start_date: date = Query(..., description="Start date for the report"),
    end_date: date = Query(..., description="End date for the report"),
    personnel_ids: Optional[List[int]] = Query(None, description="Filter by specific personnel IDs"),
    unit_id: Optional[int] = Query(None, description="Filter by organizational unit"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get periodic attendance summary for personnel within a date range"""
    
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
        return {"data": [], "summary": {}}
    
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
    results = []
    total_summary = {
        "total_personnel": len(personnel_list),
        "total_presence_minutes": 0,
        "total_tardiness_minutes": 0,
        "total_overtime_minutes": 0,
        "total_undertime_minutes": 0,
        "total_absent_days": 0,
        "total_leave_days": 0,
        "total_mission_days": 0
    }
    
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
        
        # Create personnel summary
        personnel_summary = {
            "personnel_id": personnel.id,
            "personnel_number": personnel.personnel_number,
            "first_name": personnel.first_name,
            "last_name": personnel.last_name,
            "card_number": personnel.card_number,
            "employment_type": personnel.employment_type,
            "unit_name": personnel.unit.name if personnel.unit else None,
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
        
        results.append(personnel_summary)
        
        # Update totals
        total_summary["total_presence_minutes"] += presence_minutes
        total_summary["total_tardiness_minutes"] += tardiness_minutes
        total_summary["total_overtime_minutes"] += overtime_minutes
        total_summary["total_undertime_minutes"] += undertime_minutes
        total_summary["total_absent_days"] += absent_days
        total_summary["total_leave_days"] += leave_days
        total_summary["total_mission_days"] += mission_days
    
    # Convert total summary to hours
    total_summary["total_presence_hours"] = round(total_summary["total_presence_minutes"] / 60, 2)
    total_summary["total_tardiness_hours"] = round(total_summary["total_tardiness_minutes"] / 60, 2)
    total_summary["total_overtime_hours"] = round(total_summary["total_overtime_minutes"] / 60, 2)
    total_summary["total_undertime_hours"] = round(total_summary["total_undertime_minutes"] / 60, 2)
    total_summary["adjusted_overtime_hours"] = round(max(0, total_summary["total_overtime_minutes"] - total_summary["total_undertime_minutes"]) / 60, 2)
    
    return {
        "data": results,
        "summary": total_summary,
        "report_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "filters": {
            "personnel_ids": personnel_ids,
            "unit_id": unit_id,
            "employment_type": employment_type
        }
    }

@router.get("/department-summary")
def get_department_summary(
    start_date: date = Query(..., description="Start date for the report"),
    end_date: date = Query(..., description="End date for the report"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get department-wise attendance summary"""
    
    # Get all organizational units
    units = db.query(OrganizationalUnit).filter(
        OrganizationalUnit.parent_id == None  # Top-level units only
    ).all()
    
    results = []
    
    for unit in units:
        # Get all personnel in this unit and sub-units
        all_unit_ids = [unit.id]
        
        def get_sub_units(unit_id):
            sub_units = db.query(OrganizationalUnit).filter(
                OrganizationalUnit.parent_id == unit_id
            ).all()
            for sub_unit in sub_units:
                all_unit_ids.append(sub_unit.id)
                get_sub_units(sub_unit.id)
        
        get_sub_units(unit.id)
        
        # Get personnel in these units
        personnel_list = db.query(Personnel).filter(
            and_(
                Personnel.unit_id.in_(all_unit_ids),
                Personnel.is_active == True
            )
        ).all()
        
        if not personnel_list:
            continue
        
        personnel_ids = [p.id for p in personnel_list]
        
        # Get daily summaries for these personnel
        daily_summaries = db.query(DailySummary).filter(
            and_(
                DailySummary.personnel_id.in_(personnel_ids),
                DailySummary.date >= start_date,
                DailySummary.date <= end_date
            )
        ).all()
        
        # Calculate department totals
        presence_minutes = sum(s.presence_duration for s in daily_summaries)
        tardiness_minutes = sum(s.tardiness_duration for s in daily_summaries)
        overtime_minutes = sum(s.overtime_duration for s in daily_summaries)
        undertime_minutes = sum(s.undertime_duration for s in daily_summaries)
        absent_days = sum(1 for s in daily_summaries if s.absent)
        
        department_summary = {
            "unit_id": unit.id,
            "unit_name": unit.name,
            "personnel_count": len(personnel_list),
            "total_presence_minutes": presence_minutes,
            "total_presence_hours": round(presence_minutes / 60, 2),
            "total_tardiness_minutes": tardiness_minutes,
            "total_tardiness_hours": round(tardiness_minutes / 60, 2),
            "total_overtime_minutes": overtime_minutes,
            "total_overtime_hours": round(overtime_minutes / 60, 2),
            "total_undertime_minutes": undertime_minutes,
            "total_undertime_hours": round(undertime_minutes / 60, 2),
            "total_absent_days": absent_days,
            "average_presence_hours": round(presence_minutes / 60 / len(personnel_list), 2) if personnel_list else 0
        }
        
        results.append(department_summary)
    
    return {
        "data": results,
        "report_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
    }

@router.get("/attendance-trends")
def get_attendance_trends(
    start_date: date = Query(..., description="Start date for the report"),
    end_date: date = Query(..., description="End date for the report"),
    group_by: str = Query("daily", description="Grouping period: daily, weekly, monthly"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get attendance trends over time"""
    
    # Get all daily summaries in the date range
    daily_summaries = db.query(DailySummary).filter(
        and_(
            DailySummary.date >= start_date,
            DailySummary.date <= end_date
        )
    ).all()
    
    # Group data by specified period
    if group_by == "daily":
        # Group by date
        trends = {}
        for summary in daily_summaries:
            date_key = summary.date.isoformat()
            if date_key not in trends:
                trends[date_key] = {
                    "date": date_key,
                    "total_personnel": 0,
                    "present_personnel": 0,
                    "absent_personnel": 0,
                    "total_presence_minutes": 0,
                    "total_overtime_minutes": 0,
                    "total_tardiness_minutes": 0
                }
            
            trends[date_key]["total_personnel"] += 1
            trends[date_key]["total_presence_minutes"] += summary.presence_duration
            trends[date_key]["total_overtime_minutes"] += summary.overtime_duration
            trends[date_key]["total_tardiness_minutes"] += summary.tardiness_duration
            
            if not summary.absent:
                trends[date_key]["present_personnel"] += 1
            else:
                trends[date_key]["absent_personnel"] += 1
        
        return {"data": list(trends.values()), "group_by": group_by}
    
    elif group_by == "weekly":
        # Group by week
        trends = {}
        for summary in daily_summaries:
            # Get week number and year
            week_number = summary.date.isocalendar()[1]
            year = summary.date.year
            week_key = f"{year}-W{week_number:02d}"
            
            if week_key not in trends:
                trends[week_key] = {
                    "period": week_key,
                    "year": year,
                    "week": week_number,
                    "total_personnel": 0,
                    "present_personnel": 0,
                    "absent_personnel": 0,
                    "total_presence_minutes": 0,
                    "total_overtime_minutes": 0,
                    "total_tardiness_minutes": 0
                }
            
            trends[week_key]["total_personnel"] += 1
            trends[week_key]["total_presence_minutes"] += summary.presence_duration
            trends[week_key]["total_overtime_minutes"] += summary.overtime_duration
            trends[week_key]["total_tardiness_minutes"] += summary.tardiness_duration
            
            if not summary.absent:
                trends[week_key]["present_personnel"] += 1
            else:
                trends[week_key]["absent_personnel"] += 1
        
        return {"data": list(trends.values()), "group_by": group_by}
    
    elif group_by == "monthly":
        # Group by month
        trends = {}
        for summary in daily_summaries:
            month_key = f"{summary.date.year}-{summary.date.month:02d}"
            
            if month_key not in trends:
                trends[month_key] = {
                    "period": month_key,
                    "year": summary.date.year,
                    "month": summary.date.month,
                    "total_personnel": 0,
                    "present_personnel": 0,
                    "absent_personnel": 0,
                    "total_presence_minutes": 0,
                    "total_overtime_minutes": 0,
                    "total_tardiness_minutes": 0
                }
            
            trends[month_key]["total_personnel"] += 1
            trends[month_key]["total_presence_minutes"] += summary.presence_duration
            trends[month_key]["total_overtime_minutes"] += summary.overtime_duration
            trends[month_key]["total_tardiness_minutes"] += summary.tardiness_duration
            
            if not summary.absent:
                trends[month_key]["present_personnel"] += 1
            else:
                trends[month_key]["absent_personnel"] += 1
        
        return {"data": list(trends.values()), "group_by": group_by}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid group_by parameter. Use daily, weekly, or monthly.")

@router.get("/personnel-details")
def get_personnel_detailed_report(
    personnel_id: int = Query(..., description="Personnel ID"),
    start_date: date = Query(..., description="Start date for the report"),
    end_date: date = Query(..., description="End date for the report"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get detailed daily report for a specific personnel (personnel card)"""
    
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Get daily summaries for the personnel in the date range
    daily_summaries = db.query(DailySummary).filter(
        and_(
            DailySummary.personnel_id == personnel_id,
            DailySummary.date >= start_date,
            DailySummary.date <= end_date
        )
    ).order_by(DailySummary.date).all()
    
    # Get attendance logs for the same period
    attendance_logs = db.query(AttendanceLog).filter(
        and_(
            AttendanceLog.personnel_id == personnel_id,
            AttendanceLog.timestamp >= datetime.combine(start_date, datetime.min.time()),
            AttendanceLog.timestamp <= datetime.combine(end_date, datetime.max.time())
        )
    ).order_by(AttendanceLog.timestamp).all()
    
    # Get leave requests for the period
    leave_requests = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.personnel_id == personnel_id,
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
    ).all()
    
    # Get mission requests for the period
    mission_requests = db.query(MissionRequest).filter(
        and_(
            MissionRequest.personnel_id == personnel_id,
            MissionRequest.status == 'approved',
            MissionRequest.start_date <= end_date,
            MissionRequest.end_date >= start_date
        )
    ).all()
    
    # Process daily data with attendance logs
    detailed_days = []
    
    for summary in daily_summaries:
        # Get attendance logs for this specific day
        day_logs = [
            {
                "id": log.id,
                "timestamp": log.timestamp,
                "device_id": log.device_id,
                "log_type": log.log_type
            }
            for log in attendance_logs
            if log.timestamp.date() == summary.date
        ]
        
        # Get leave/mission info for this day
        day_leave = None
        day_mission = None
        
        for leave in leave_requests:
            if leave.start_date <= summary.date <= leave.end_date:
                day_leave = {
                    "id": leave.id,
                    "leave_type": leave.leave_type.name,
                    "is_hourly": leave.is_hourly,
                    "start_time": leave.start_time,
                    "end_time": leave.end_time,
                    "requester_notes": leave.requester_notes
                }
                break
        
        for mission in mission_requests:
            if mission.start_date <= summary.date <= mission.end_date:
                day_mission = {
                    "id": mission.id,
                    "mission_type": mission.mission_type.name,
                    "destination": mission.destination,
                    "purpose": mission.purpose,
                    "is_hourly": mission.is_hourly,
                    "start_time": mission.start_time,
                    "end_time": mission.end_time
                }
                break
        
        day_detail = {
            "date": summary.date,
            "status": summary.status,
            "shift_id": summary.shift_id,
            "shift_name": summary.shift.name if summary.shift else None,
            "presence_duration": summary.presence_duration,
            "presence_hours": round(summary.presence_duration / 60, 2),
            "tardiness_duration": summary.tardiness_duration,
            "tardiness_hours": round(summary.tardiness_duration / 60, 2),
            "overtime_duration": summary.overtime_duration,
            "overtime_hours": round(summary.overtime_duration / 60, 2),
            "undertime_duration": summary.undertime_duration,
            "undertime_hours": round(summary.undertime_duration / 60, 2),
            "absent": summary.absent,
            "expected_work_duration": summary.expected_work_duration,
            "expected_work_hours": round(summary.expected_work_duration / 60, 2),
            "first_entry_time": summary.first_entry_time,
            "last_exit_time": summary.last_exit_time,
            "notes": summary.notes,
            "attendance_logs": day_logs,
            "leave_info": day_leave,
            "mission_info": day_mission
        }
        
        detailed_days.append(day_detail)
    
    # Calculate totals for the period
    total_presence = sum(d["presence_duration"] for d in detailed_days)
    total_tardiness = sum(d["tardiness_duration"] for d in detailed_days)
    total_overtime = sum(d["overtime_duration"] for d in detailed_days)
    total_undertime = sum(d["undertime_duration"] for d in detailed_days)
    total_absent = sum(1 for d in detailed_days if d["absent"])
    
    # Calculate working days (excluding holidays, weekends, leaves, missions)
    working_days = len([d for d in detailed_days if d["status"] in ['OK', 'IncompleteLog']])
    
    # Calculate leave and mission days
    leave_days = len([d for d in detailed_days if d["leave_info"]])
    mission_days = len([d for d in detailed_days if d["mission_info"]])
    
    # Personnel basic info
    personnel_info = {
        "id": personnel.id,
        "personnel_number": personnel.personnel_number,
        "first_name": personnel.first_name,
        "last_name": personnel.last_name,
        "card_number": personnel.card_number,
        "employment_type": personnel.employment_type,
        "unit_name": personnel.unit.name if personnel.unit else None,
        "work_group_name": personnel.work_group.name if personnel.work_group else None,
        "start_date": personnel.start_date,
        "end_date": personnel.end_date
    }
    
    return {
        "personnel_info": personnel_info,
        "report_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "daily_details": detailed_days,
        "period_totals": {
            "total_presence_minutes": total_presence,
            "total_presence_hours": round(total_presence / 60, 2),
            "total_tardiness_minutes": total_tardiness,
            "total_tardiness_hours": round(total_tardiness / 60, 2),
            "total_overtime_minutes": total_overtime,
            "total_overtime_hours": round(total_overtime / 60, 2),
            "total_undertime_minutes": total_undertime,
            "total_undertime_hours": round(total_undertime / 60, 2),
            "adjusted_overtime_minutes": max(0, total_overtime - total_undertime),
            "adjusted_overtime_hours": round(max(0, total_overtime - total_undertime) / 60, 2),
            "total_absent_days": total_absent,
            "total_leave_days": leave_days,
            "total_mission_days": mission_days,
            "working_days": working_days,
            "total_days": len(detailed_days)
        }
    }

@router.get("/personnel-summary")
def get_personnel_summary_report(
    personnel_id: int = Query(..., description="Personnel ID"),
    start_date: date = Query(..., description="Start date for the report"),
    end_date: date = Query(..., description="End date for the report"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get summary report for a specific personnel"""
    
    # Check if personnel exists
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Personnel not found")
    
    # Get daily summaries for the personnel in the date range
    daily_summaries = db.query(DailySummary).filter(
        and_(
            DailySummary.personnel_id == personnel_id,
            DailySummary.date >= start_date,
            DailySummary.date <= end_date
        )
    ).all()
    
    # Calculate totals
    total_presence = sum(s.presence_duration for s in daily_summaries)
    total_tardiness = sum(s.tardiness_duration for s in daily_summaries)
    total_overtime = sum(s.overtime_duration for s in daily_summaries)
    total_undertime = sum(s.undertime_duration for s in daily_summaries)
    total_absent = sum(1 for s in daily_summaries if s.absent)
    
    # Get leave and mission data
    leave_requests = db.query(LeaveRequest).filter(
        and_(
            LeaveRequest.personnel_id == personnel_id,
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
    ).all()
    
    mission_requests = db.query(MissionRequest).filter(
        and_(
            MissionRequest.personnel_id == personnel_id,
            MissionRequest.status == 'approved',
            MissionRequest.start_date <= end_date,
            MissionRequest.end_date >= start_date
        )
    ).all()
    
    # Calculate leave and mission days
    leave_days = 0
    for leave in leave_requests:
        leave_start = max(leave.start_date, start_date)
        leave_end = min(leave.end_date, end_date)
        if leave_start <= leave_end:
            leave_days += (leave_end - leave_start).days + 1
    
    mission_days = 0
    for mission in mission_requests:
        mission_start = max(mission.start_date, start_date)
        mission_end = min(mission.end_date, end_date)
        if mission_start <= mission_end:
            mission_days += (mission_end - mission_start).days + 1
    
    # Personnel info
    personnel_info = {
        "id": personnel.id,
        "personnel_number": personnel.personnel_number,
        "first_name": personnel.first_name,
        "last_name": personnel.last_name,
        "card_number": personnel.card_number,
        "employment_type": personnel.employment_type,
        "unit_name": personnel.unit.name if personnel.unit else None
    }
    
    return {
        "personnel_info": personnel_info,
        "report_period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "summary": {
            "total_presence_minutes": total_presence,
            "total_presence_hours": round(total_presence / 60, 2),
            "total_tardiness_minutes": total_tardiness,
            "total_tardiness_hours": round(total_tardiness / 60, 2),
            "total_overtime_minutes": total_overtime,
            "total_overtime_hours": round(total_overtime / 60, 2),
            "total_undertime_minutes": total_undertime,
            "total_undertime_hours": round(total_undertime / 60, 2),
            "adjusted_overtime_minutes": max(0, total_overtime - total_undertime),
            "adjusted_overtime_hours": round(max(0, total_overtime - total_undertime) / 60, 2),
            "total_absent_days": total_absent,
            "total_leave_days": leave_days,
            "total_mission_days": mission_days,
            "total_work_days": len(daily_summaries),
            "leave_requests": [
                {
                    "id": leave.id,
                    "leave_type": leave.leave_type.name,
                    "start_date": leave.start_date.isoformat(),
                    "end_date": leave.end_date.isoformat(),
                    "status": leave.status
                }
                for leave in leave_requests
            ],
            "mission_requests": [
                {
                    "id": mission.id,
                    "mission_type": mission.mission_type.name,
                    "destination": mission.destination,
                    "start_date": mission.start_date.isoformat(),
                    "end_date": mission.end_date.isoformat(),
                    "status": mission.status
                }
                for mission in mission_requests
            ]
        }
    }