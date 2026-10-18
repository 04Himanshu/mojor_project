from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

# ==========================================
# Permission Catalog
# ==========================================
ALL_PERMISSIONS = [
    # Inventory
    {"code": "inventory:view", "name": "View Inventory", "module": "Inventory", "description": "View inventory items, stock levels, and valuations"},
    {"code": "inventory:create", "name": "Create Items", "module": "Inventory", "description": "Add new inventory SKUs and products"},
    {"code": "inventory:edit", "name": "Edit Items", "module": "Inventory", "description": "Update item pricing, names, and reorder levels"},
    {"code": "inventory:delete", "name": "Delete Items", "module": "Inventory", "description": "Deactivate or remove inventory items"},
    {"code": "inventory:stock_adjust", "name": "Stock Movements & Adjustments", "module": "Inventory", "description": "Manual stock-in, stock-out, and audit cycle counts"},
    
    # Orders
    {"code": "orders:view", "name": "View Orders", "module": "Orders", "description": "View sales orders, customer details, and dispatch statuses"},
    {"code": "orders:create", "name": "Create Orders", "module": "Orders", "description": "Create new customer sales orders"},
    {"code": "orders:status_change", "name": "Update Order Status", "module": "Orders", "description": "Transition orders through Confirmed, Dispatched, Delivered"},
    {"code": "orders:invoice", "name": "Tax Invoices", "module": "Orders", "description": "Generate, download, and print customer tax invoices"},
    
    # Procurement & Vendors
    {"code": "procurement:view", "name": "View Procurement", "module": "Procurement", "description": "View vendors, purchase orders, and goods receipts"},
    {"code": "procurement:create_po", "name": "Create Purchase Orders", "module": "Procurement", "description": "Generate and issue POs to vendors"},
    {"code": "procurement:grn_receive", "name": "Inward Goods (GRN)", "module": "Procurement", "description": "Inspect and receive shipments directly into warehouse stock"},
    {"code": "suppliers:manage", "name": "Manage Suppliers", "module": "Procurement", "description": "Create, edit, and evaluate vendor profiles and payment terms"},
    
    # Users & Roles
    {"code": "users:view", "name": "View Staff Directory", "module": "Security & RBAC", "description": "View user accounts and department assignments"},
    {"code": "users:create", "name": "Add Staff Members", "module": "Security & RBAC", "description": "Register new staff accounts and set initial roles"},
    {"code": "users:edit", "name": "Edit Staff & Roles", "module": "Security & RBAC", "description": "Change staff details, roles, and account status"},
    {"code": "roles:manage", "name": "Manage Roles & Permissions", "module": "Security & RBAC", "description": "Create custom roles and configure permission matrices"},
]

VALID_USER_STATUSES = ["Active", "Suspended", "Inactive"]
VALID_DEPARTMENTS = ["Operations", "Logistics & Warehouse", "Procurement", "Sales & Fulfillment", "Finance & Admin", "Executive"]

# ==========================================
# Role Schemas
# ==========================================
class RoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color: Optional[str] = Field("blue", description="Badge color tag: blue, purple, emerald, amber, rose, cyan, indigo")
    permissions: List[str] = Field(default_factory=list, description="List of permission codes")

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    permissions: Optional[List[str]] = None

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: str
    permissions: List[str]
    is_system: bool
    user_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# User Schemas
# ==========================================
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    role_id: int = Field(..., gt=0)
    phone: Optional[str] = Field(None, max_length=50)
    department: Optional[str] = Field("Operations", max_length=100)
    status: Optional[str] = Field("Active", description="Active, Suspended, Inactive")
    is_active: Optional[bool] = True
    avatar_color: Optional[str] = Field("blue", description="Color theme for avatar initials")

class UserCreate(UserBase):
    password: Optional[str] = Field(None, min_length=6, description="Initial staff account password")

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role_id: Optional[int] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_color: Optional[str] = None
    password: Optional[str] = None

class UserStatusUpdate(BaseModel):
    status: str = Field(..., description="Active, Suspended, Inactive")

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role_id: int
    role_name: str
    role_color: str
    role_permissions: List[str] = []
    phone: Optional[str] = None
    department: str
    status: str
    is_active: bool
    avatar_color: str
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# Statistics & Overview
# ==========================================
class UserStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_roles: int
    admin_users: int
