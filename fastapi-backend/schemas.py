from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date, time

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Organizational Unit Schemas
class UnitBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

class Unit(UnitBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UnitWithChildren(Unit):
    children: List['Unit'] = []
    personnel_count: int = 0

# Personnel Schemas
class PersonnelBase(BaseModel):
    card_number: str
    personnel_number: str
    first_name: str
    last_name: str
    start_date: datetime
    end_date: Optional[datetime] = None
    employment_type: str
    unit_id: int
    is_active: bool = True

class PersonnelCreate(PersonnelBase):
    pass

class PersonnelUpdate(BaseModel):
    card_number: Optional[str] = None
    personnel_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    employment_type: Optional[str] = None
    unit_id: Optional[int] = None
    is_active: Optional[bool] = None

class Personnel(PersonnelBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PersonnelWithUnit(Personnel):
    unit: Unit

# Update forward references
UnitWithChildren.model_rebuild()

# Shift Schemas
class ShiftBase(BaseModel):
    name: str
    start_time_1: time
    end_time_1: time
    start_time_2: Optional[time] = None
    end_time_2: Optional[time] = None
    allowed_log_start_time: time
    log_period_duration: int = 15
    float_duration_minutes: int = 15
    is_night_shift: bool = False
    description: Optional[str] = None
    is_active: bool = True

class ShiftCreate(ShiftBase):
    pass

class ShiftUpdate(BaseModel):
    name: Optional[str] = None
    start_time_1: Optional[time] = None
    end_time_1: Optional[time] = None
    start_time_2: Optional[time] = None
    end_time_2: Optional[time] = None
    allowed_log_start_time: Optional[time] = None
    log_period_duration: Optional[int] = None
    float_duration_minutes: Optional[int] = None
    is_night_shift: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Shift(ShiftBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Calendar Schemas
class CalendarBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class CalendarCreate(CalendarBase):
    pass

class CalendarUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class Calendar(CalendarBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Holiday Schemas
class HolidayBase(BaseModel):
    date: date
    name: str
    calendar_id: int
    description: Optional[str] = None

class HolidayCreate(HolidayBase):
    pass

class Holiday(HolidayBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CalendarWithHolidays(Calendar):
    holidays: List[Holiday] = []

# Work Group Schemas
class WorkGroupBase(BaseModel):
    name: str
    repetition_period_days: int = 7
    calendar_id: int
    start_date: datetime
    is_active: bool = True
    description: Optional[str] = None

class WorkGroupCreate(WorkGroupBase):
    shift_assignments: List[dict] = []  # List of {"day_of_cycle": int, "shift_id": int}

class WorkGroupUpdate(BaseModel):
    name: Optional[str] = None
    repetition_period_days: Optional[int] = None
    calendar_id: Optional[int] = None
    start_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None
    shift_assignments: Optional[List[dict]] = None

class WorkGroup(WorkGroupBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class WorkGroupShiftBase(BaseModel):
    work_group_id: int
    day_of_cycle: int
    shift_id: int

class WorkGroupShiftCreate(WorkGroupShiftBase):
    pass

class WorkGroupShift(WorkGroupShiftBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class WorkGroupWithDetails(WorkGroup):
    calendar: Calendar
    shift_assignments: List[WorkGroupShift] = []

# Update Personnel schemas to include work_group_id
class PersonnelBase(BaseModel):
    card_number: str
    personnel_number: str
    first_name: str
    last_name: str
    start_date: datetime
    end_date: Optional[datetime] = None
    employment_type: str
    unit_id: int
    work_group_id: Optional[int] = None
    is_active: bool = True

class PersonnelCreate(PersonnelBase):
    pass

class PersonnelUpdate(BaseModel):
    card_number: Optional[str] = None
    personnel_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    employment_type: Optional[str] = None
    unit_id: Optional[int] = None
    work_group_id: Optional[int] = None
    is_active: Optional[bool] = None

class PersonnelWorkGroupAssignment(BaseModel):
    work_group_id: int

# Attendance Log Schemas
class AttendanceLogBase(BaseModel):
    card_number: str
    timestamp: datetime
    device_id: Optional[str] = None
    log_type: Optional[str] = None

class AttendanceLogCreate(AttendanceLogBase):
    pass

class AttendanceLogManualCreate(BaseModel):
    personnel_id: int
    timestamp: datetime
    device_id: Optional[str] = None
    log_type: Optional[str] = None
    notes: Optional[str] = None

class AttendanceLogUpdate(BaseModel):
    timestamp: Optional[datetime] = None
    device_id: Optional[str] = None
    log_type: Optional[str] = None

class AttendanceLog(AttendanceLogBase):
    id: int
    personnel_id: int
    is_processed: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AttendanceLogWithPersonnel(AttendanceLog):
    personnel: dict

# Daily Summary Schemas
class DailySummaryBase(BaseModel):
    personnel_id: int
    date: date
    shift_id: Optional[int] = None
    presence_duration: int = 0
    tardiness_duration: int = 0
    overtime_duration: int = 0
    undertime_duration: int = 0
    absent: bool = False
    status: str = 'OK'
    expected_work_duration: int = 0
    notes: Optional[str] = None

class DailySummaryCreate(DailySummaryBase):
    pass

class DailySummaryUpdate(BaseModel):
    shift_id: Optional[int] = None
    presence_duration: Optional[int] = None
    tardiness_duration: Optional[int] = None
    overtime_duration: Optional[int] = None
    undertime_duration: Optional[int] = None
    absent: Optional[bool] = None
    status: Optional[str] = None
    first_entry_time: Optional[datetime] = None
    last_exit_time: Optional[datetime] = None
    expected_work_duration: Optional[int] = None
    notes: Optional[str] = None

class DailySummary(DailySummaryBase):
    id: int
    first_entry_time: Optional[datetime] = None
    last_exit_time: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DailySummaryWithDetails(DailySummary):
    personnel: dict
    shift: Optional[dict] = None

# Processing Request Schemas
class AttendanceProcessingRequest(BaseModel):
    start_date: date
    end_date: date
    personnel_ids: Optional[List[int]] = None
    force_reprocess: bool = False

class AttendanceProcessingResponse(BaseModel):
    processed_days: int
    processed_personnel: int
    errors: List[str] = []
    warnings: List[str] = []

# Leave Type Schemas
class LeaveTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    counts_as_work: bool = True
    requires_approval: bool = True
    max_days_per_year: Optional[int] = None
    is_active: bool = True

class LeaveTypeCreate(LeaveTypeBase):
    pass

class LeaveTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    counts_as_work: Optional[bool] = None
    requires_approval: Optional[bool] = None
    max_days_per_year: Optional[int] = None
    is_active: Optional[bool] = None

class LeaveType(LeaveTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Leave Request Schemas
class LeaveRequestBase(BaseModel):
    personnel_id: int
    leave_type_id: int
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_hourly: bool = False
    requester_notes: Optional[str] = None

class LeaveRequestCreate(LeaveRequestBase):
    pass

class LeaveRequestUpdate(BaseModel):
    leave_type_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_hourly: Optional[bool] = None
    requester_notes: Optional[str] = None

class LeaveRequestStatusUpdate(BaseModel):
    status: str  # approved, rejected
    approver_notes: Optional[str] = None

class LeaveRequest(LeaveRequestBase):
    id: int
    status: str
    approver_notes: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LeaveRequestWithDetails(LeaveRequest):
    personnel: dict
    leave_type: LeaveType
    approver: Optional[dict] = None

# Mission Type Schemas
class MissionTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    counts_as_work: bool = True
    requires_approval: bool = True
    is_active: bool = True

class MissionTypeCreate(MissionTypeBase):
    pass

class MissionTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    counts_as_work: Optional[bool] = None
    requires_approval: Optional[bool] = None
    is_active: Optional[bool] = None

class MissionType(MissionTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Mission Request Schemas
class MissionRequestBase(BaseModel):
    personnel_id: int
    mission_type_id: int
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_hourly: bool = False
    requester_notes: Optional[str] = None
    destination: Optional[str] = None
    purpose: Optional[str] = None

class MissionRequestCreate(MissionRequestBase):
    pass

class MissionRequestUpdate(BaseModel):
    mission_type_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_hourly: Optional[bool] = None
    requester_notes: Optional[str] = None
    destination: Optional[str] = None
    purpose: Optional[str] = None

class MissionRequestStatusUpdate(BaseModel):
    status: str  # approved, rejected
    approver_notes: Optional[str] = None

class MissionRequest(MissionRequestBase):
    id: int
    status: str
    approver_notes: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class MissionRequestWithDetails(MissionRequest):
    personnel: dict
    mission_type: MissionType
    approver: Optional[dict] = None