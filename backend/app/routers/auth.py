from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List

from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, 
    AuthResponse, 
    DemoStaffAccount,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    MessageResponse
)
from app.schemas.user import UserResponse
from app.services import user_service
from app.core import security
from app.core.config import settings
from app.core.rate_limiter import rate_limit, limiter, get_client_ip

router = APIRouter()

@router.post(
    "/login", 
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit(key_prefix="auth_login"))]
)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates staff credentials with rate limiting and returns a signed bearer token.
    Rate limited to prevent brute-force credential stuffing.
    """
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
        
    # Reset rate limiting counter on successful authentication
    client_ip = get_client_ip(request)
    limiter.reset(f"auth_login:{client_ip}")

    # If password is not yet hashed with PBKDF2, automatically upgrade it
    if not user.hashed_password or not user.hashed_password.startswith("pbkdf2_sha256$"):
        user.hashed_password = security.hash_password(payload.password)

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
    """Retrieves the profile of the currently authenticated staff member using verified bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing or malformed."
        )
        
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = security.decode_access_token(token, check_revocation=True)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired, was revoked, or token is invalid. Please log in again."
        )
        
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active or user.status in ["Suspended", "Inactive"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or suspended."
        )
        
    return user_service._format_user_response(user)

@router.post("/logout", response_model=MessageResponse)
def logout(authorization: Optional[str] = Header(None)):
    """
    Terminates the user's active session and blacklists the provided bearer token.
    Prevents token reuse after logout.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization token is required to log out."
        )
    
    token = authorization.split("Bearer ", 1)[1].strip()
    security.revoke_token(token)
    return MessageResponse(message="Successfully logged out. Session has been terminated.")

@router.post(
    "/forgot-password", 
    response_model=ForgotPasswordResponse,
    dependencies=[Depends(rate_limit(max_requests=4, window_seconds=900, key_prefix="forgot_pw"))]
)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a secure, short-lived (15 minute) cryptographic password reset token.
    Rate limited to prevent email enumeration and flooding.
    """
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(email_clean)).first()
    
    if not user or not user.is_active:
        # Return generic success message to prevent user enumeration
        return ForgotPasswordResponse(
            message="If this email is registered in our staff directory, password reset instructions have been generated.",
            reset_token=None
        )
    
    reset_token = security.create_password_reset_token(user_id=user.id, email=user.email)
    
    return ForgotPasswordResponse(
        message="Password reset token generated successfully. Valid for 15 minutes.",
        reset_token=reset_token
    )

@router.post(
    "/reset-password", 
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=900, key_prefix="reset_pw"))]
)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates a password reset token, updates the user's password with PBKDF2 hashing,
    revokes the reset token, and invalidates all existing user sessions.
    """
    token_payload = security.verify_password_reset_token(payload.token)
    if not token_payload or "sub" not in token_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid, expired, or has already been used."
        )
        
    user_id = int(token_payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Associated staff account is inactive or not found."
        )
        
    # Update password with salted PBKDF2 hash
    user.hashed_password = security.hash_password(payload.new_password)
    user.updated_at = datetime.utcnow()
    
    # Invalidate the used reset token immediately
    security.revoke_token(payload.token)
    
    # Revoke all previous active sessions for this user
    security.revoke_user_tokens(user.id)
    
    db.commit()
    db.refresh(user)
    
    return MessageResponse(message="Password reset successfully. All previous sessions invalidated. Please log in with your new password.")

@router.post("/test-reset-rate-limit")
def reset_rate_limit(request: Request):
    """Development/Testing helper to clear rate limiter records for calling IP."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Endpoint disabled in production")
    client_ip = get_client_ip(request)
    limiter.reset(f"auth_login:{client_ip}")
    limiter.reset(f"forgot_pw:{client_ip}")
    limiter.reset(f"reset_pw:{client_ip}")
    return {"message": f"Rate limits reset for IP {client_ip}"}

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
