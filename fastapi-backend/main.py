from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn

from database import engine, get_db
from models import Base
from schemas import UserCreate, User as UserSchema, Token
from crud import create_user, get_user_by_email, authenticate_user
from security import create_access_token, get_current_active_user
from config import settings

# Import routers
from routers import org_units, personnel, calendars, holidays, shifts, work_groups, attendance, daily_summary, leave_types, mission_types, leave_requests, mission_requests, reports, exports

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Attendance System API",
    description="FastAPI backend for attendance management system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(org_units.router)
app.include_router(personnel.router)
app.include_router(calendars.router)
app.include_router(holidays.router)
app.include_router(shifts.router)
app.include_router(work_groups.router)
app.include_router(attendance.router)
app.include_router(daily_summary.router)
app.include_router(leave_types.router)
app.include_router(mission_types.router)
app.include_router(leave_requests.router)
app.include_router(mission_requests.router)
app.include_router(reports.router)
app.include_router(exports.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Attendance System API"}

@app.post("/register", response_model=UserSchema)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    # Check if user already exists
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    return create_user(db=db, user=user)

@app.post("/token", response_model=Token)
async def login_for_access_token(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Login and get access token
    """
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information
    """
    return current_user

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )