from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    email: str = Field(..., description="Staff work email address")
    password: str = Field(..., description="Staff account password")

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DemoStaffAccount(BaseModel):
    id: int
    name: str
    email: str
    role_name: str
    department: str
    avatar_color: str
    password_hint: str

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Registered staff email address")

class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = Field(None, description="Reset token provided for local/testing delivery")

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Valid password reset token")
    new_password: str = Field(..., min_length=6, description="New strong account password")

class MessageResponse(BaseModel):
    message: str
