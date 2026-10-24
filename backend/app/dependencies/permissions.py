from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.models.user import User
from app.core import security
from app.services import user_service

def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer token"),
    db: Session = Depends(get_db)
) -> User:
    """
    Core authentication dependency.
    Validates cryptographic JWT Bearer token, checks token revocation, and fetches active user from DB.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Bearer token is missing or malformed.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    payload = security.decode_access_token(token, check_revocation=True)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired, was revoked, or token is invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity encoded in token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user record no longer exists."
        )

    if not user.is_active or user.status in ["Suspended", "Inactive"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Staff account '{user.name}' is {user.status.lower()}. Access denied."
        )

    return user

def require_roles(allowed_roles: List[str]):
    """
    Role-Based Access Control (RBAC) dependency.
    Validates that the authenticated user's role is in the allowed list.
    """
    normalized_allowed = [r.strip().lower() for r in allowed_roles]
    # Normalize Admin and Administrator aliases
    if "admin" in normalized_allowed and "administrator" not in normalized_allowed:
        normalized_allowed.append("administrator")
    if "administrator" in normalized_allowed and "admin" not in normalized_allowed:
        normalized_allowed.append("admin")

    def role_checker(user: User = Depends(get_current_user)) -> Dict[str, Any]:
        user_role_name = user.role.name if user.role else "Staff"
        if user_role_name.lower() not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User role '{user_role_name}' is not authorized. Required: {', '.join(allowed_roles)}."
            )

        return {
            "user": user,
            "user_id": user.id,
            "user_name": user.name,
            "role": user_role_name,
            "role_name": user_role_name
        }

    return role_checker

def require_permission(permission_code: str):
    """
    Fine-grained Permission-Based Access Control.
    Checks if the user's role grants the specific permission code.
    Administrators automatically have all permissions.
    """
    def permission_checker(user: User = Depends(get_current_user)) -> Dict[str, Any]:
        role_name = (user.role.name if user.role else "").lower()
        if role_name in ["administrator", "admin"]:
            return {
                "user": user,
                "user_id": user.id,
                "user_name": user.name,
                "role": user.role.name if user.role else "Administrator",
                "role_name": user.role.name if user.role else "Administrator"
            }

        perms = user_service._parse_permissions(user.role.permissions) if user.role else []
        if permission_code not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Account lacks required permission '{permission_code}'."
            )

        return {
            "user": user,
            "user_id": user.id,
            "user_name": user.name,
            "role": user.role.name if user.role else "Staff",
            "role_name": user.role.name if user.role else "Staff"
        }

    return permission_checker

def require_any_permission(permission_codes: List[str]):
    """
    Checks if the user's role grants AT LEAST ONE of the specified permission codes.
    Administrators automatically have all permissions.
    """
    def any_permission_checker(user: User = Depends(get_current_user)) -> Dict[str, Any]:
        role_name = (user.role.name if user.role else "").lower()
        if role_name in ["administrator", "admin"]:
            return {
                "user": user,
                "user_id": user.id,
                "user_name": user.name,
                "role": user.role.name if user.role else "Administrator",
                "role_name": user.role.name if user.role else "Administrator"
            }

        perms = set(user_service._parse_permissions(user.role.permissions) if user.role else [])
        if not perms.intersection(permission_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Account lacks required permissions. Requires at least one of: {', '.join(permission_codes)}."
            )

        return {
            "user": user,
            "user_id": user.id,
            "user_name": user.name,
            "role": user.role.name if user.role else "Staff",
            "role_name": user.role.name if user.role else "Staff"
        }

    return any_permission_checker
