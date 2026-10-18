from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, AuthResponse, DemoStaffAccount
from app.schemas.user import UserResponse
from app.services import user_service
from app.core import security

router = APIRouter()

@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates staff credentials and returns a secure bearer token and user profile."""
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )
        
    if not user.is_active or user.status in ["Suspended", "Inactive"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Staff account '{user.name}' is currently {user.status.lower()}. Access denied. Please contact system administrator."
        )
        
    if not security.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )
        
    # Update last login timestamp
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    formatted_user = user_service._format_user_response(user)
    token = security.create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": formatted_user.role_name
    })
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=formatted_user
    )

@router.get("/me", response_model=UserResponse)
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Retrieves the profile of the currently authenticated staff member."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing or malformed."
        )
        
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = security.decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please log in again."
        )
        
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active."
        )
        
    return user_service._format_user_response(user)

@router.get("/demo-accounts", response_model=List[DemoStaffAccount])
def get_demo_accounts(db: Session = Depends(get_db)):
    """Returns available active staff accounts with role information for quick one-click demo login."""
    users = db.query(User).filter(User.is_active == True).limit(6).all()
    demo_list = []
    for u in users:
        role_title = u.role.name if u.role else "Staff"
        demo_list.append(DemoStaffAccount(
            id=u.id,
            name=u.name,
            email=u.email,
            role_name=role_title,
            department=u.department or "Operations",
            avatar_color=u.avatar_color or "blue",
            password_hint="admin123" if "admin" in u.email or (u.role and u.role.name == "Administrator") else "password"
        ))
    return demo_list
