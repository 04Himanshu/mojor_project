import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.core.database import engine
from sqlalchemy import inspect, text

def migrate_users_and_roles():
    insp = inspect(engine)
    with engine.connect() as conn:
        # Check roles columns
        role_cols = [c['name'] for c in insp.get_columns('roles')]
        print("Current roles cols:", role_cols)
        
        if 'description' not in role_cols:
            print("Adding columns to roles table...")
            conn.execute(text("ALTER TABLE roles ADD COLUMN description VARCHAR(255) NULL"))
        if 'color' not in role_cols:
            conn.execute(text("ALTER TABLE roles ADD COLUMN color VARCHAR(50) DEFAULT 'blue'"))
        if 'permissions' not in role_cols:
            conn.execute(text("ALTER TABLE roles ADD COLUMN permissions TEXT NULL"))
        if 'is_system' not in role_cols:
            conn.execute(text("ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT FALSE"))
        if 'created_at' not in role_cols:
            conn.execute(text("ALTER TABLE roles ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
        if 'updated_at' not in role_cols:
            conn.execute(text("ALTER TABLE roles ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
        
        # Check users columns
        user_cols = [c['name'] for c in insp.get_columns('users')]
        print("Current users cols:", user_cols)
        
        if 'phone' not in user_cols:
            print("Adding columns to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL"))
        if 'department' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT 'Operations'"))
        if 'status' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'Active'"))
        if 'is_active' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
        if 'hashed_password' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255) NULL"))
        if 'avatar_color' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_color VARCHAR(50) DEFAULT 'blue'"))
        if 'last_login' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME NULL"))
        if 'created_at' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
        if 'updated_at' not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
        
        conn.commit()
        print("Migration complete!")

if __name__ == "__main__":
    migrate_users_and_roles()
