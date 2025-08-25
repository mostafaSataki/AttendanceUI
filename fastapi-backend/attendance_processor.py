from sqlalchemy.orm import Session
from typing import List, Optional, Tuple, Dict
from datetime import datetime, date, time, timedelta
import logging

from models import (
    Personnel, WorkGroup, WorkGroupShift, Shift, Calendar, 
    Holiday, AttendanceLog, DailySummary, LeaveRequest, MissionRequest
)
from schemas import AttendanceProcessingRequest, AttendanceProcessingResponse

logger = logging.getLogger(__name__)

class AttendanceProcessor:
    def __init__(self, db: Session):
        self.db = db
    
    def process_attendance(self, request: AttendanceProcessingRequest) -> AttendanceProcessingResponse:
        """Process attendance for a date range and optional personnel list"""
        errors = []
        warnings = []
        processed_days = 0
        processed_personnel = 0
        
        try:
            # Get personnel to process
            if request.personnel_ids:
                personnel_list = self.db.query(Personnel).filter(
                    Personnel.id.in_(request.personnel_ids),
                    Personnel.is_active == True
                ).all()
            else:
                personnel_list = self.db.query(Personnel).filter(
                    Personnel.is_active == True
                ).all()
            
            if not personnel_list:
                errors.append("No active personnel found for processing")
                return AttendanceProcessingResponse(
                    processed_days=0,
                    processed_personnel=0,
                    errors=errors,
                    warnings=warnings
                )
            
            processed_personnel = len(personnel_list)
            
            # Process each personnel
            for personnel in personnel_list:
                try:
                    days_processed = self._process_personnel_attendance(
                        personnel, request.start_date, request.end_date, request.force_reprocess
                    )
                    processed_days += days_processed
                except Exception as e:
                    logger.error(f"Error processing personnel {personnel.id}: {str(e)}")
                    errors.append(f"Error processing personnel {personnel.id}: {str(e)}")
            
            return AttendanceProcessingResponse(
                processed_days=processed_days,
                processed_personnel=processed_personnel,
                errors=errors,
                warnings=warnings
            )
        
        except Exception as e:
            logger.error(f"Error in attendance processing: {str(e)}")
            errors.append(f"General processing error: {str(e)}")
            return AttendanceProcessingResponse(
                processed_days=processed_days,
                processed_personnel=processed_personnel,
                errors=errors,
                warnings=warnings
            )
    
    def _process_personnel_attendance(
        self, personnel: Personnel, start_date: date, end_date: date, force_reprocess: bool
    ) -> int:
        """Process attendance for a single personnel"""
        processed_days = 0
        
        # Check if personnel has work group
        if not personnel.work_group:
            logger.warning(f"Personnel {personnel.id} has no work group assigned")
            return 0
        
        # Get work group details
        work_group = personnel.work_group
        calendar = work_group.calendar
        
        # Process each day in the range
        current_date = start_date
        while current_date <= end_date:
            try:
                # Skip if before personnel start date
                if current_date < personnel.start_date.date():
                    current_date += timedelta(days=1)
                    continue
                
                # Skip if after personnel end date
                if personnel.end_date and current_date > personnel.end_date.date():
                    current_date += timedelta(days=1)
                    continue
                
                # Check if already processed and not forcing reprocess
                existing_summary = self.db.query(DailySummary).filter(
                    DailySummary.personnel_id == personnel.id,
                    DailySummary.date == current_date
                ).first()
                
                if existing_summary and not force_reprocess:
                    current_date += timedelta(days=1)
                    continue
                
                # Process the day
                self._process_personnel_day(personnel, work_group, calendar, current_date)
                processed_days += 1
                
            except Exception as e:
                logger.error(f"Error processing personnel {personnel.id} on {current_date}: {str(e)}")
            
            current_date += timedelta(days=1
        
        return processed_days
    
    def _process_personnel_day(
        self, personnel: Personnel, work_group: WorkGroup, calendar: Calendar, target_date: date
    ):
        """Process attendance for a single day"""
        # Check if it's a holiday
        holiday = self.db.query(Holiday).filter(
            Holiday.calendar_id == calendar.id,
            Holiday.date == target_date
        ).first()
        
        if holiday:
            # Create holiday summary
            self._create_holiday_summary(personnel, target_date, holiday)
            return
        
        # Check for approved leave requests
        leave_request = self.db.query(LeaveRequest).filter(
            LeaveRequest.personnel_id == personnel.id,
            LeaveRequest.status == 'approved',
            LeaveRequest.start_date <= target_date,
            LeaveRequest.end_date >= target_date
        ).first()
        
        if leave_request:
            # Create leave summary
            self._create_leave_summary(personnel, target_date, leave_request)
            return
        
        # Check for approved mission requests
        mission_request = self.db.query(MissionRequest).filter(
            MissionRequest.personnel_id == personnel.id,
            MissionRequest.status == 'approved',
            MissionRequest.start_date <= target_date,
            MissionRequest.end_date >= target_date
        ).first()
        
        if mission_request:
            # Create mission summary
            self._create_mission_summary(personnel, target_date, mission_request)
            return
        
        # Get shift for this day
        shift = self._get_shift_for_date(work_group, target_date)
        if not shift:
            # No shift assigned for this day
            self._create_no_shift_summary(personnel, target_date)
            return
        
        # Get attendance logs for the day
        logs = self._get_day_logs(personnel.id, target_date)
        
        # Process logs and calculate times
        result = self._calculate_attendance_times(logs, shift, target_date)
        
        # Create or update daily summary
        self._create_or_update_daily_summary(personnel, target_date, shift, result)
        
        # Mark logs as processed
        for log in logs:
            log.is_processed = True
        
        self.db.commit()
    
    def _get_shift_for_date(self, work_group: WorkGroup, target_date: date) -> Optional[Shift]:
        """Get the shift assigned to a work group for a specific date"""
        # Calculate day of cycle
        days_diff = (target_date - work_group.start_date.date()).days
        day_of_cycle = (days_diff % work_group.repetition_period_days) + 1
        
        # Get shift assignment for this day
        assignment = self.db.query(WorkGroupShift).filter(
            WorkGroupShift.work_group_id == work_group.id,
            WorkGroupShift.day_of_cycle == day_of_cycle
        ).first()
        
        return assignment.shift if assignment else None
    
    def _get_day_logs(self, personnel_id: int, target_date: date) -> List[AttendanceLog]:
        """Get attendance logs for a specific personnel and date"""
        start_datetime = datetime.combine(target_date, time.min)
        end_datetime = datetime.combine(target_date, time.max)
        
        logs = self.db.query(AttendanceLog).filter(
            AttendanceLog.personnel_id == personnel_id,
            AttendanceLog.timestamp >= start_datetime,
            AttendanceLog.timestamp <= end_datetime
        ).order_by(AttendanceLog.timestamp).all()
        
        return logs
    
    def _calculate_attendance_times(
        self, logs: List[AttendanceLog], shift: Shift, target_date: date
    ) -> Dict:
        """Calculate attendance times based on logs and shift rules"""
        result = {
            'first_entry_time': None,
            'last_exit_time': None,
            'presence_duration': 0,
            'tardiness_duration': 0,
            'overtime_duration': 0,
            'undertime_duration': 0,
            'absent': False,
            'status': 'OK',
            'expected_work_duration': 0,
            'notes': None
        }
        
        if not logs:
            result['absent'] = True
            result['status'] = 'Absent'
            return result
        
        # Get first entry and last exit
        result['first_entry_time'] = logs[0].timestamp
        result['last_exit_time'] = logs[-1].timestamp
        
        # Calculate expected work duration
        work_duration_1 = self._time_diff_minutes(shift.start_time_1, shift.end_time_1)
        if shift.start_time_2 and shift.end_time_2:
            work_duration_2 = self._time_diff_minutes(shift.start_time_2, shift.end_time_2)
            result['expected_work_duration'] = work_duration_1 + work_duration_2
        else:
            result['expected_work_duration'] = work_duration_1
        
        # Calculate presence duration
        if len(logs) >= 2:
            # Pair logs (entry with exit)
            paired_logs = self._pair_logs(logs)
            total_presence = 0
            
            for entry, exit in paired_logs:
                duration = self._datetime_diff_minutes(entry.timestamp, exit.timestamp)
                total_presence += duration
            
            result['presence_duration'] = total_presence
        
        # Calculate tardiness
        if result['first_entry_time']:
            entry_time = result['first_entry_time'].time()
            allowed_start = shift.allowed_log_start_time
            
            if entry_time > allowed_start:
                tardiness_minutes = self._time_diff_minutes(allowed_start, entry_time)
                # Subtract float duration
                tardiness_minutes = max(0, tardiness_minutes - shift.float_duration_minutes)
                result['tardiness_duration'] = tardiness_minutes
        
        # Calculate overtime
        if result['last_exit_time']:
            exit_time = result['last_exit_time'].time()
            expected_end = shift.end_time_2 if shift.end_time_2 else shift.end_time_1
            
            if exit_time > expected_end:
                overtime_minutes = self._time_diff_minutes(expected_end, exit_time)
                result['overtime_duration'] = overtime_minutes
        
        # Calculate undertime
        if result['presence_duration'] < result['expected_work_duration']:
            result['undertime_duration'] = result['expected_work_duration'] - result['presence_duration']
        
        # Check for incomplete logs
        if len(logs) % 2 != 0:
            result['status'] = 'IncompleteLog'
            result['notes'] = 'Odd number of attendance logs'
        
        return result
    
    def _pair_logs(self, logs: List[AttendanceLog]) -> List[Tuple[AttendanceLog, AttendanceLog]]:
        """Pair entry and exit logs"""
        pairs = []
        i = 0
        
        while i < len(logs) - 1:
            # Simple pairing: consecutive logs
            pairs.append((logs[i], logs[i + 1]))
            i += 2
        
        return pairs
    
    def _time_diff_minutes(self, start_time: time, end_time: time) -> int:
        """Calculate difference between two times in minutes"""
        start_datetime = datetime.combine(date.today(), start_time)
        end_datetime = datetime.combine(date.today(), end_time)
        
        if end_datetime < start_datetime:
            end_datetime += timedelta(days=1)
        
        return int((end_datetime - start_datetime).total_seconds() / 60)
    
    def _datetime_diff_minutes(self, start_datetime: datetime, end_datetime: datetime) -> int:
        """Calculate difference between two datetimes in minutes"""
        return int((end_datetime - start_datetime).total_seconds() / 60)
    
    def _create_holiday_summary(self, personnel: Personnel, target_date: date, holiday: Holiday):
        """Create daily summary for holiday"""
        summary = DailySummary(
            personnel_id=personnel.id,
            date=target_date,
            status='Holiday',
            notes=f'Holiday: {holiday.name}'
        )
        
        # Update existing or create new
        existing = self.db.query(DailySummary).filter(
            DailySummary.personnel_id == personnel.id,
            DailySummary.date == target_date
        ).first()
        
        if existing:
            for key, value in summary.__dict__.items():
                if key != 'id' and not key.startswith('_'):
                    setattr(existing, key, getattr(summary, key))
        else:
            self.db.add(summary)
    
    def _create_no_shift_summary(self, personnel: Personnel, target_date: date):
        """Create daily summary for day with no shift"""
        summary = DailySummary(
            personnel_id=personnel.id,
            date=target_date,
            status='NoShift',
            notes='No shift assigned for this day'
        )
        
        # Update existing or create new
        existing = self.db.query(DailySummary).filter(
            DailySummary.personnel_id == personnel.id,
            DailySummary.date == target_date
        ).first()
        
        if existing:
            for key, value in summary.__dict__.items():
                if key != 'id' and not key.startswith('_'):
                    setattr(existing, key, getattr(summary, key))
        else:
            self.db.add(summary)
    
    def _create_or_update_daily_summary(
        self, personnel: Personnel, target_date: date, shift: Shift, result: Dict
    ):
        """Create or update daily summary"""
        summary = DailySummary(
            personnel_id=personnel.id,
            date=target_date,
            shift_id=shift.id,
            presence_duration=result['presence_duration'],
            tardiness_duration=result['tardiness_duration'],
            overtime_duration=result['overtime_duration'],
            undertime_duration=result['undertime_duration'],
            absent=result['absent'],
            status=result['status'],
            first_entry_time=result['first_entry_time'],
            last_exit_time=result['last_exit_time'],
            expected_work_duration=result['expected_work_duration'],
            notes=result['notes']
        )
        
        # Update existing or create new
        existing = self.db.query(DailySummary).filter(
            DailySummary.personnel_id == personnel.id,
            DailySummary.date == target_date
        ).first()
        
        if existing:
            for key, value in summary.__dict__.items():
                if key != 'id' and not key.startswith('_'):
                    setattr(existing, key, getattr(summary, key))
        else:
            self.db.add(summary)
    
    def _create_leave_summary(self, personnel: Personnel, target_date: date, leave_request: LeaveRequest):
        """Create daily summary for leave"""
        # Calculate leave duration
        if leave_request.is_hourly and leave_request.start_time and leave_request.end_time:
            # Hourly leave - calculate duration in minutes
            leave_duration = self._time_diff_minutes(leave_request.start_time, leave_request.end_time)
            status = 'PartialLeave'
            notes = f'Hourly leave: {leave_request.leave_type.name} ({leave_duration} minutes)'
        else:
            # Daily leave
            leave_duration = 480  # Assume 8 hours for daily leave
            status = 'OnLeave'
            notes = f'Daily leave: {leave_request.leave_type.name}'
        
        # Set presence duration based on leave type
        presence_duration = leave_duration if leave_request.leave_type.counts_as_work else 0
        
        summary = DailySummary(
            personnel_id=personnel.id,
            date=target_date,
            presence_duration=presence_duration,
            tardiness_duration=0,
            overtime_duration=0,
            undertime_duration=0,
            absent=False,
            status=status,
            expected_work_duration=leave_duration,
            notes=notes
        )
        
        # Update existing or create new
        existing = self.db.query(DailySummary).filter(
            DailySummary.personnel_id == personnel.id,
            DailySummary.date == target_date
        ).first()
        
        if existing:
            for key, value in summary.__dict__.items():
                if key != 'id' and not key.startswith('_'):
                    setattr(existing, key, getattr(summary, key))
        else:
            self.db.add(summary)
    
    def _create_mission_summary(self, personnel: Personnel, target_date: date, mission_request: MissionRequest):
        """Create daily summary for mission"""
        # Calculate mission duration
        if mission_request.is_hourly and mission_request.start_time and mission_request.end_time:
            # Hourly mission - calculate duration in minutes
            mission_duration = self._time_diff_minutes(mission_request.start_time, mission_request.end_time)
            status = 'PartialMission'
            notes = f'Hourly mission: {mission_request.mission_type.name} to {mission_request.destination} ({mission_duration} minutes)'
        else:
            # Daily mission
            mission_duration = 480  # Assume 8 hours for daily mission
            status = 'OnMission'
            notes = f'Daily mission: {mission_request.mission_type.name} to {mission_request.destination}'
        
        # Set presence duration based on mission type
        presence_duration = mission_duration if mission_request.mission_type.counts_as_work else 0
        
        summary = DailySummary(
            personnel_id=personnel.id,
            date=target_date,
            presence_duration=presence_duration,
            tardiness_duration=0,
            overtime_duration=0,
            undertime_duration=0,
            absent=False,
            status=status,
            expected_work_duration=mission_duration,
            notes=notes
        )
        
        # Update existing or create new
        existing = self.db.query(DailySummary).filter(
            DailySummary.personnel_id == personnel.id,
            DailySummary.date == target_date
        ).first()
        
        if existing:
            for key, value in summary.__dict__.items():
                if key != 'id' and not key.startswith('_'):
                    setattr(existing, key, getattr(summary, key))
        else:
            self.db.add(summary)