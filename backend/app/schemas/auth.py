from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    email: str
    password: str

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
