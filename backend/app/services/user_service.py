import json
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from app.models.user import User
from app.models.role import Role
from app.schemas.user import (
    RoleCreate, RoleUpdate, RoleResponse,
    UserCreate, UserUpdate, UserStatusUpdate, UserResponse,
    UserStatsResponse, ALL_PERMISSIONS
)

def _parse_permissions(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception:
        return [p.strip() for p in raw.split(",") if p.strip()]

def _serialize_permissions(perms: List[str]) -> str:
    return json.dumps(list(set(perms)))

# ==========================================
# Role Services
# ==========================================
def get_roles(db: Session) -> List[RoleResponse]:
    roles = db.query(Role).order_by(Role.id.asc()).all()
    results = []
    for r in roles:
        user_count = db.query(User).filter(User.role_id == r.id).count()
        results.append(RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            color=r.color or "blue",
            permissions=_parse_permissions(r.permissions),
            is_system=r.is_system,
            user_count=user_count,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    return results

def get_role_by_id(db: Session, role_id: int) -> Optional[Role]:
    return db.query(Role).filter(Role.id == role_id).first()

def create_role(db: Session, data: RoleCreate) -> RoleResponse:
    existing = db.query(Role).filter(Role.name.ilike(data.name.strip())).first()
    if existing:
        raise ValueError(f"A role with the name '{data.name.strip()}' already exists.")
    
    role = Role(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        color=data.color or "blue",
        permissions=_serialize_permissions(data.permissions or []),
        is_system=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        color=role.color,
        permissions=_parse_permissions(role.permissions),
        is_system=role.is_system,
        user_count=0,
        created_at=role.created_at,
        updated_at=role.updated_at
    )

def update_role(db: Session, role_id: int, data: RoleUpdate) -> Optional[RoleResponse]:
    role = get_role_by_id(db, role_id)
    if not role:
        return None
    
    if data.name and data.name.strip() != role.name:
        if role.is_system:
            raise ValueError("System role names cannot be modified.")
        existing = db.query(Role).filter(Role.name.ilike(data.name.strip()), Role.id != role_id).first()
        if existing:
            raise ValueError(f"Role name '{data.name.strip()}' is already in use.")
        role.name = data.name.strip()

    if data.description is not None:
        role.description = data.description.strip()
    if data.color is not None:
        role.color = data.color
    if data.permissions is not None:
        role.permissions = _serialize_permissions(data.permissions)
    
    role.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(role)

    user_count = db.query(User).filter(User.role_id == role.id).count()
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        color=role.color,
        permissions=_parse_permissions(role.permissions),
        is_system=role.is_system,
        user_count=user_count,
        created_at=role.created_at,
        updated_at=role.updated_at
    )

def delete_role(db: Session, role_id: int) -> bool:
    role = get_role_by_id(db, role_id)
    if not role:
        return False
    if role.is_system:
        raise ValueError("Built-in system roles cannot be deleted.")
    
    user_count = db.query(User).filter(User.role_id == role_id).count()
    if user_count > 0:
        raise ValueError(f"Cannot delete role '{role.name}' because {user_count} staff member(s) are assigned to it.")

    db.delete(role)
    db.commit()
    return True

# ==========================================
# User Services
# ==========================================
def _format_user_response(u: User) -> UserResponse:
    perms = _parse_permissions(u.role.permissions) if u.role else []
    return UserResponse(
        id=u.id,
        name=u.name,
        email=u.email,
        role_id=u.role_id,
        role_name=u.role.name if u.role else "Unassigned",
        role_color=u.role.color if u.role else "slate",
        role_permissions=perms,
        phone=u.phone,
        department=u.department or "Operations",
        status=u.status or "Active",
        is_active=u.is_active,
        avatar_color=u.avatar_color or "blue",
        last_login=u.last_login,
        created_at=u.created_at,
        updated_at=u.updated_at
    )

def get_users(
    db: Session,
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[UserResponse]:
    query = db.query(User)
    if role_id:
        query = query.filter(User.role_id == role_id)
    if department and department.upper() != "ALL":
        query = query.filter(User.department == department)
    if status and status.upper() != "ALL":
        query = query.filter(User.status == status)
    if search:
        s = f"%{search.strip()}%"
        query = query.join(Role, isouter=True).filter(
            or_(
                User.name.ilike(s),
                User.email.ilike(s),
                User.phone.ilike(s),
                User.department.ilike(s),
                Role.name.ilike(s)
            )
        )

    users = query.order_by(User.name.asc()).offset(skip).limit(limit).all()
    return [_format_user_response(u) for u in users]

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, data: UserCreate) -> UserResponse:
    email_clean = data.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise ValueError(f"Email '{email_clean}' is already registered to staff member '{existing.name}'.")

    role = get_role_by_id(db, data.role_id)
    if not role:
        raise ValueError(f"Role ID {data.role_id} does not exist.")

    colors = ["blue", "purple", "emerald", "amber", "rose", "cyan", "indigo"]
    avatar_color = data.avatar_color or colors[len(data.name) % len(colors)]

    status_val = data.status or "Active"
    is_active_val = status_val == "Active"

    user = User(
        name=data.name.strip(),
        email=email_clean,
        role_id=data.role_id,
        phone=data.phone.strip() if data.phone else None,
        department=data.department or "Operations",
        status=status_val,
        is_active=is_active_val,
        hashed_password=data.password or "eom_default_secret",
        avatar_color=avatar_color,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _format_user_response(user)

def update_user(db: Session, user_id: int, data: UserUpdate) -> Optional[UserResponse]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    if data.email:
        email_clean = data.email.strip().lower()
        if email_clean != user.email:
            existing = db.query(User).filter(User.email == email_clean, User.id != user_id).first()
            if existing:
                raise ValueError(f"Email '{email_clean}' is already registered to another user.")
            user.email = email_clean

    if data.name:
        user.name = data.name.strip()
    if data.role_id:
        role = get_role_by_id(db, data.role_id)
        if not role:
            raise ValueError(f"Role ID {data.role_id} does not exist.")
        user.role_id = data.role_id
    if data.phone is not None:
        user.phone = data.phone.strip() if data.phone else None
    if data.department is not None:
        user.department = data.department
    if data.status is not None:
        user.status = data.status
        user.is_active = (data.status == "Active")
    if data.is_active is not None:
        user.is_active = data.is_active
        if not data.is_active and user.status == "Active":
            user.status = "Inactive"
        elif data.is_active and user.status != "Active":
            user.status = "Active"
    if data.avatar_color:
        user.avatar_color = data.avatar_color
    if data.password:
        user.hashed_password = data.password

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return _format_user_response(user)

def update_user_status(db: Session, user_id: int, status: str) -> Optional[UserResponse]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.status = status
    user.is_active = (status == "Active")
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return _format_user_response(user)

def delete_user(db: Session, user_id: int) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    # If user is Administrator and only 1 admin exists, prevent deletion
    admin_role = db.query(Role).filter(Role.name == "Administrator").first()
    if admin_role and user.role_id == admin_role.id:
        admin_count = db.query(User).filter(User.role_id == admin_role.id).count()
        if admin_count <= 1:
            raise ValueError("Cannot delete the last remaining Administrator account.")

    db.delete(user)
    db.commit()
    return True

# ==========================================
# Stats & Analytics
# ==========================================
def get_user_stats(db: Session) -> UserStatsResponse:
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_roles = db.query(Role).count()
    
    admin_role = db.query(Role).filter(Role.name == "Administrator").first()
    admin_count = db.query(User).filter(User.role_id == admin_role.id).count() if admin_role else 0

    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_roles=total_roles,
        admin_users=admin_count
    )

# ==========================================
# Seed Default Users & Roles
# ==========================================
def seed_default_users_and_roles_if_empty(db: Session):
    if db.query(Role).count() == 0:
        all_code_list = [p["code"] for p in ALL_PERMISSIONS]
        
        default_roles = [
            Role(
                name="Administrator",
                description="Unrestricted administrative access to all system modules, configurations, and user management.",
                color="purple",
                permissions=_serialize_permissions(all_code_list),
                is_system=True
            ),
            Role(
                name="Inventory Manager",
                description="Full operational authority over stock movements, manual adjustments, item pricing, and catalog SKUs.",
                color="blue",
                permissions=_serialize_permissions([
                    "inventory:view", "inventory:create", "inventory:edit", "inventory:delete", "inventory:stock_adjust",
                    "orders:view", "procurement:view"
                ]),
                is_system=True
            ),
            Role(
                name="Procurement Specialist",
                description="Authority to negotiate supplier contracts, issue purchase orders, and inward inventory shipments (GRN).",
                color="indigo",
                permissions=_serialize_permissions([
                    "procurement:view", "procurement:create_po", "procurement:grn_receive", "suppliers:manage",
                    "inventory:view", "inventory:stock_adjust"
                ]),
                is_system=True
            ),
            Role(
                name="Sales & Order Executive",
                description="Manages customer accounts, processes sales orders, transitions shipping states, and issues tax invoices.",
                color="emerald",
                permissions=_serialize_permissions([
                    "orders:view", "orders:create", "orders:status_change", "orders:invoice",
                    "inventory:view"
                ]),
                is_system=True
            ),
            Role(
                name="Warehouse Operator",
                description="Performs warehouse dock operations, physical stock picking, goods receipt inspection, and inwarding.",
                color="amber",
                permissions=_serialize_permissions([
                    "inventory:view", "inventory:stock_adjust", "procurement:grn_receive"
                ]),
                is_system=True
            ),
            Role(
                name="Auditor & Viewer",
                description="Read-only access across inventory records, financial totals, customer orders, and supplier directory.",
                color="slate",
                permissions=_serialize_permissions([
                    "inventory:view", "orders:view", "procurement:view", "users:view"
                ]),
                is_system=False
            ),
        ]
        for r in default_roles:
            db.add(r)
        db.commit()

    if db.query(User).count() == 0:
        admin_r = db.query(Role).filter(Role.name == "Administrator").first()
        inv_r = db.query(Role).filter(Role.name == "Inventory Manager").first()
        proc_r = db.query(Role).filter(Role.name == "Procurement Specialist").first()
        sales_r = db.query(Role).filter(Role.name == "Sales & Order Executive").first()
        wh_r = db.query(Role).filter(Role.name == "Warehouse Operator").first()

        default_users = [
            User(
                name="Admin User",
                email="admin@eom.com",
                role_id=admin_r.id,
                phone="+91 98000 11223",
                department="Executive",
                status="Active",
                is_active=True,
                avatar_color="purple",
                last_login=datetime.utcnow()
            ),
            User(
                name="Neha Verma",
                email="neha.verma@eom.com",
                role_id=inv_r.id,
                phone="+91 98111 22334",
                department="Logistics & Warehouse",
                status="Active",
                is_active=True,
                avatar_color="blue",
                last_login=datetime.utcnow()
            ),
            User(
                name="Rajesh Sharma",
                email="rajesh.sharma@eom.com",
                role_id=proc_r.id,
                phone="+91 98222 33445",
                department="Procurement",
                status="Active",
                is_active=True,
                avatar_color="indigo",
                last_login=datetime.utcnow()
            ),
            User(
                name="Amit Patel",
                email="amit.patel@eom.com",
                role_id=sales_r.id,
                phone="+91 98333 44556",
                department="Sales & Fulfillment",
                status="Active",
                is_active=True,
                avatar_color="emerald",
                last_login=datetime.utcnow()
            ),
            User(
                name="Sunil Rao",
                email="sunil.rao@eom.com",
                role_id=wh_r.id,
                phone="+91 98444 55667",
                department="Logistics & Warehouse",
                status="Active",
                is_active=True,
                avatar_color="amber",
                last_login=datetime.utcnow()
            ),
        ]
        for u in default_users:
            db.add(u)
        db.commit()