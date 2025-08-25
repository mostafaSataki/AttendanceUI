from sqlalchemy.orm import Session
from typing import Optional, List
from models import User, OrganizationalUnit, Personnel
from schemas import UserCreate, PersonnelCreate, UnitCreate
from security import get_password_hash, verify_password

# User CRUD operations
def create_user(db: Session, user: UserCreate) -> User:
    """
    Create a new user in the database
    """
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str) -> User:
    """
    Get a user by email
    """
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> User:
    """
    Get a user by ID
    """
    return db.query(User).filter(User.id == user_id).first()

def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Authenticate a user by email and password
    """
    user = get_user_by_email(db, email=email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Organizational Unit CRUD operations
def create_org_unit(db: Session, unit: UnitCreate) -> OrganizationalUnit:
    """
    Create a new organizational unit
    """
    db_unit = OrganizationalUnit(**unit.dict())
    db.add(db_unit)
    db.commit()
    db.refresh(db_unit)
    return db_unit

def get_org_unit_by_id(db: Session, unit_id: int) -> Optional[OrganizationalUnit]:
    """
    Get an organizational unit by ID
    """
    return db.query(OrganizationalUnit).filter(OrganizationalUnit.id == unit_id).first()

def get_org_units(db: Session, skip: int = 0, limit: int = 100) -> List[OrganizationalUnit]:
    """
    Get all organizational units
    """
    return db.query(OrganizationalUnit).offset(skip).limit(limit).all()

def get_org_units_tree(db: Session) -> List[OrganizationalUnit]:
    """
    Get organizational units as a tree structure
    """
    # Get all units
    all_units = db.query(OrganizationalUnit).all()
    
    # Build tree structure
    unit_dict = {unit.id: unit for unit in all_units}
    root_units = []
    
    for unit in all_units:
        if unit.parent_id is None:
            root_units.append(unit)
        else:
            parent = unit_dict.get(unit.parent_id)
            if parent:
                if not hasattr(parent, 'children'):
                    parent.children = []
                parent.children.append(unit)
    
    return root_units

def update_org_unit(db: Session, unit_id: int, unit_update: dict) -> Optional[OrganizationalUnit]:
    """
    Update an organizational unit
    """
    db_unit = get_org_unit_by_id(db, unit_id)
    if not db_unit:
        return None
    
    for key, value in unit_update.items():
        if value is not None:
            setattr(db_unit, key, value)
    
    db.commit()
    db.refresh(db_unit)
    return db_unit

def delete_org_unit(db: Session, unit_id: int) -> bool:
    """
    Delete an organizational unit
    """
    db_unit = get_org_unit_by_id(db, unit_id)
    if not db_unit:
        return False
    
    # Check if unit has children
    if db_unit.children:
        raise ValueError("Cannot delete unit with children")
    
    # Check if unit has personnel
    if db_unit.personnel:
        raise ValueError("Cannot delete unit with assigned personnel")
    
    db.delete(db_unit)
    db.commit()
    return True

# Personnel CRUD operations
def create_personnel(db: Session, personnel: PersonnelCreate) -> Personnel:
    """
    Create a new personnel record
    """
    db_personnel = Personnel(**personnel.dict())
    db.add(db_personnel)
    db.commit()
    db.refresh(db_personnel)
    return db_personnel

def get_personnel_by_id(db: Session, personnel_id: int) -> Optional[Personnel]:
    """
    Get personnel by ID
    """
    return db.query(Personnel).filter(Personnel.id == personnel_id).first()

def get_personnel_by_card_number(db: Session, card_number: str) -> Optional[Personnel]:
    """
    Get personnel by card number
    """
    return db.query(Personnel).filter(Personnel.card_number == card_number).first()

def get_personnel_by_personnel_number(db: Session, personnel_number: str) -> Optional[Personnel]:
    """
    Get personnel by personnel number
    """
    return db.query(Personnel).filter(Personnel.personnel_number == personnel_number).first()

def get_personnel_list(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    unit_id: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None
) -> List[Personnel]:
    """
    Get personnel list with filtering options
    """
    query = db.query(Personnel)
    
    if unit_id is not None:
        query = query.filter(Personnel.unit_id == unit_id)
    
    if search is not None:
        search_term = f"%{search}%"
        query = query.filter(
            (Personnel.first_name.ilike(search_term)) |
            (Personnel.last_name.ilike(search_term)) |
            (Personnel.personnel_number.ilike(search_term)) |
            (Personnel.card_number.ilike(search_term))
        )
    
    if is_active is not None:
        query = query.filter(Personnel.is_active == is_active)
    
    return query.offset(skip).limit(limit).all()

def update_personnel(db: Session, personnel_id: int, personnel_update: dict) -> Optional[Personnel]:
    """
    Update personnel information
    """
    db_personnel = get_personnel_by_id(db, personnel_id)
    if not db_personnel:
        return None
    
    for key, value in personnel_update.items():
        if value is not None:
            setattr(db_personnel, key, value)
    
    db.commit()
    db.refresh(db_personnel)
    return db_personnel

def delete_personnel(db: Session, personnel_id: int) -> bool:
    """
    Delete (deactivate) a personnel record
    """
    db_personnel = get_personnel_by_id(db, personnel_id)
    if not db_personnel:
        return False
    
    # Soft delete by setting is_active to False
    db_personnel.is_active = False
    db.commit()
    return True