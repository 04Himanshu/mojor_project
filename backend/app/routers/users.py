from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.dependencies.permissions import require_permission, require_roles
from app.core import security
from app.schemas.user import (
    RoleCreate, RoleUpdate, RoleResponse,
    UserCreate, UserUpdate, UserStatusUpdate, UserResponse,
    UserStatsResponse, ALL_PERMISSIONS
)
from app.services import user_service

router = APIRouter()

# ==========================================
# Overview Stats & Permissions Catalog
# ==========================================
@router.get("/stats", response_model=UserStatsResponse)
def get_user_stats(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:view"))
):
    """Retrieve high-level user and role metrics for executive dashboard cards."""
    return user_service.get_user_stats(db)

@router.get("/permissions")
def get_permissions_catalog():
    """Returns the full granular RBAC permission matrix definitions grouped by module."""
    modules = {}
    for p in ALL_PERMISSIONS:
        mod = p["module"]
        if mod not in modules:
            modules[mod] = []
        modules[mod].append(p)
    return {
        "all_permissions": ALL_PERMISSIONS,
        "grouped_by_module": modules
    }

# ==========================================
# Roles Endpoints (Strictly protected by roles:manage)
# ==========================================
@router.get("/roles", response_model=List[RoleResponse])
def get_roles(
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:view"))
):
    """List all configured system and custom user roles with assigned staff count."""
    return user_service.get_roles(db)

@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    data: RoleCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("roles:manage"))
):
    """Create a new custom role with a selected permission set. Requires 'roles:manage'."""
    try:
        return user_service.create_role(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/roles/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:view"))
):
    """Retrieve details for a specific role."""
    role = user_service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    all_roles = user_service.get_roles(db)
    for r in all_roles:
        if r.id == role_id:
            return r
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

@router.put("/roles/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int, 
    data: RoleUpdate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("roles:manage"))
):
    """Update role metadata, badge color, and assigned permissions. Requires 'roles:manage'."""
    try:
        updated = user_service.update_role(db, role_id, data)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("roles:manage"))
):
    """Delete a custom role. System built-in roles and roles with active users cannot be deleted."""
    try:
        success = user_service.delete_role(db, role_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# ==========================================
# Users Endpoints (Strictly protected by users:view/create/edit)
# ==========================================
@router.get("/", response_model=List[UserResponse])
def get_users(
    search: Optional[str] = Query(None, description="Search by name, email, phone, role, or department"),
    role_id: Optional[int] = Query(None, description="Filter by role ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (Active, Suspended, Inactive)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:view"))
):
    """Retrieve staff users list with filtering and search. Requires 'users:view'."""
    return user_service.get_users(
        db=db,
        search=search,
        role_id=role_id,
        department=department,
        status=status,
        skip=skip,
        limit=limit
    )

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:create"))
):
    """Register a new staff user with an assigned role and department. Requires 'users:create'."""
    try:
        return user_service.create_user(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:view"))
):
    """Retrieve single user details with role and permissions. Requires 'users:view'."""
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user_service._format_user_response(user)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    data: UserUpdate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:edit"))
):
    """Update staff profile details, role, department, or active status. Requires 'users:edit'."""
    try:
        updated = user_service.update_user(db, user_id, data)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        # If password or active state changed, invalidate user's previous sessions
        if data.password or data.is_active is False or data.status in ["Suspended", "Inactive"]:
            security.revoke_user_tokens(user_id)

        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int, 
    data: UserStatusUpdate, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_permission("users:edit"))
):
    """Quick toggle or update staff status (Active, Suspended, Inactive). Requires 'users:edit'."""
    updated = user_service.update_user_status(db, user_id, data.status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # If account is suspended or inactive, immediately revoke all existing sessions
    if data.status in ["Suspended", "Inactive"]:
        security.revoke_user_tokens(user_id)

    return updated

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(require_roles(["Administrator", "Admin"]))
):
    """Delete a staff user. Restricted to Administrator role. Invalidate all user sessions."""
    try:
        # Revoke sessions first
        security.revoke_user_tokens(user_id)
        success = user_service.delete_user(db, user_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
