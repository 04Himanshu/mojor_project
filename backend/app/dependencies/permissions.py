from fastapi import Header, HTTPException, status
from typing import List, Optional

def require_roles(allowed_roles: List[str]):
    """
    Role-Based Access Control (RBAC) dependency.
    Validates that the executing user possesses one of the allowed roles.
    Defaults to 'Admin' if no header is supplied to facilitate testing.
    """
    def role_checker(
        x_user_role: Optional[str] = Header(default="Admin", description="User role (e.g. Admin, Manager, Staff)"),
        x_user_name: Optional[str] = Header(default="Admin User", description="Name of the authenticated user")
    ):
        normalized_role = x_user_role.strip().capitalize() if x_user_role else "Staff"
        normalized_allowed = [r.capitalize() for r in allowed_roles]

        if normalized_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role '{x_user_role}' is not authorized to perform this action. Required role(s): {', '.join(allowed_roles)}"
            )

        return {
            "role": normalized_role,
            "user_name": x_user_name.strip() if x_user_name else "System User"
        }

    return role_checker
