from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Time, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class OrganizationalUnit(Base):
    __tablename__ = "organizational_units"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("OrganizationalUnit", remote_side=[id], back_populates="children")
    children = relationship("OrganizationalUnit", back_populates="parent")
    personnel = relationship("Personnel", back_populates="unit")

class Personnel(Base):
    __tablename__ = "personnel"
    
    id = Column(Integer, primary_key=True, index=True)
    card_number = Column(String, unique=True, index=True, nullable=False)
    personnel_number = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    employment_type = Column(String, nullable=False)  # Full-time, Part-time, Contract, etc.
    unit_id = Column(Integer, ForeignKey("organizational_units.id"), nullable=False, index=True)
    work_group_id = Column(Integer, ForeignKey("work_groups.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    unit = relationship("OrganizationalUnit", back_populates="personnel")
    work_group = relationship("WorkGroup", back_populates="personnel")
    attendance_logs = relationship("AttendanceLog", back_populates="personnel")
    daily_summaries = relationship("DailySummary", back_populates="personnel")

class Shift(Base):
    __tablename__ = "shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    start_time_1 = Column(Time, nullable=False)  # First shift start time
    end_time_1 = Column(Time, nullable=False)    # First shift end time
    start_time_2 = Column(Time, nullable=True)   # Second shift start time (for split shifts)
    end_time_2 = Column(Time, nullable=True)     # Second shift end time (for split shifts)
    allowed_log_start_time = Column(Time, nullable=False)  # When logging is allowed to start
    log_period_duration = Column(Integer, nullable=False, default=15)  # Duration in minutes for logging period
    float_duration_minutes = Column(Integer, nullable=False, default=15)  # Float time in minutes
    is_night_shift = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Calendar(Base):
    __tablename__ = "calendars"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    holidays = relationship("Holiday", back_populates="calendar")
    work_groups = relationship("WorkGroup", back_populates="calendar")

class Holiday(Base):
    __tablename__ = "holidays"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    name = Column(String, nullable=False)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    calendar = relationship("Calendar", back_populates="holidays")

class WorkGroup(Base):
    __tablename__ = "work_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    repetition_period_days = Column(Integer, nullable=False, default=7)  # Repetition period in days (e.g., 7 for weekly)
    calendar_id = Column(Integer, ForeignKey("calendars.id"), nullable=False, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    calendar = relationship("Calendar", back_populates="work_groups")
    shift_assignments = relationship("WorkGroupShift", back_populates="work_group")
    personnel = relationship("Personnel", back_populates="work_group")

class WorkGroupShift(Base):
    __tablename__ = "work_group_shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    work_group_id = Column(Integer, ForeignKey("work_groups.id"), nullable=False, index=True)
    day_of_cycle = Column(Integer, nullable=False, index=True)  # Day number in the cycle (1, 2, 3, etc.)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    work_group = relationship("WorkGroup", back_populates="shift_assignments")
    shift = relationship("Shift")

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    device_id = Column(String, nullable=True, index=True)  # Optional device identifier
    log_type = Column(String, nullable=True)  # 'IN', 'OUT', or null for auto-detection
    is_processed = Column(Boolean, default=False)  # Flag to indicate if this log has been processed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    personnel = relationship("Personnel", back_populates="attendance_logs")

class DailySummary(Base):
    __tablename__ = "daily_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True, index=True)
    presence_duration = Column(Integer, default=0)  # Duration in minutes
    tardiness_duration = Column(Integer, default=0)  # Duration in minutes
    overtime_duration = Column(Integer, default=0)  # Duration in minutes
    undertime_duration = Column(Integer, default=0)  # Duration in minutes (negative overtime)
    absent = Column(Boolean, default=False)
    status = Column(String, default='OK')  # OK, IncompleteLog, Error, Holiday, Weekend
    first_entry_time = Column(DateTime(timezone=True), nullable=True)
    last_exit_time = Column(DateTime(timezone=True), nullable=True)
    expected_work_duration = Column(Integer, default=0)  # Expected work duration in minutes
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    personnel = relationship("Personnel", back_populates="daily_summaries")
    shift = relationship("Shift")
    leave_requests = relationship("LeaveRequest", back_populates="personnel")
    mission_requests = relationship("MissionRequest", back_populates="personnel")

class LeaveType(Base):
    __tablename__ = "leave_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    counts_as_work = Column(Boolean, default=True)  # Whether it counts as work time
    requires_approval = Column(Boolean, default=True)  # Whether it requires approval
    max_days_per_year = Column(Integer, nullable=True)  # Maximum days per year
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    leave_requests = relationship("LeaveRequest", back_populates="leave_type")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False, index=True)
    leave_type_id = Column(Integer, ForeignKey("leave_types.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=True)  # For hourly leaves
    end_time = Column(Time, nullable=True)    # For hourly leaves
    is_hourly = Column(Boolean, default=False)  # Flag for hourly vs daily leave
    status = Column(String, default='pending')  # pending, approved, rejected
    requester_notes = Column(String, nullable=True)
    approver_notes = Column(String, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    personnel = relationship("Personnel", back_populates="leave_requests")
    leave_type = relationship("LeaveType", back_populates="leave_requests")
    approver = relationship("User", foreign_keys=[approved_by])

class MissionType(Base):
    __tablename__ = "mission_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    counts_as_work = Column(Boolean, default=True)  # Whether it counts as work time
    requires_approval = Column(Boolean, default=True)  # Whether it requires approval
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    mission_requests = relationship("MissionRequest", back_populates="mission_type")

class MissionRequest(Base):
    __tablename__ = "mission_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False, index=True)
    mission_type_id = Column(Integer, ForeignKey("mission_types.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=True)  # For hourly missions
    end_time = Column(Time, nullable=True)    # For hourly missions
    is_hourly = Column(Boolean, default=False)  # Flag for hourly vs daily mission
    status = Column(String, default='pending')  # pending, approved, rejected
    requester_notes = Column(String, nullable=True)
    approver_notes = Column(String, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    destination = Column(String, nullable=True)  # Mission destination
    purpose = Column(String, nullable=True)      # Mission purpose
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    personnel = relationship("Personnel", back_populates="mission_requests")
    mission_type = relationship("MissionType", back_populates="mission_requests")
    approver = relationship("User", foreign_keys=[approved_by])