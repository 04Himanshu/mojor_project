from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DB_URL
# Automatically normalize mysql:// to mysql+pymysql:// so PyMySQL is used
if db_url.startswith("mysql://"):
    db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

# Only SQLite supports/requires 'check_same_thread'
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_order_payment_columns():
    """Ensures payment columns exist on orders table across SQLite and MySQL."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if inspector.has_table("orders"):
            existing_cols = {col["name"] for col in inspector.get_columns("orders")}
            with engine.connect() as conn:
                if "payment_gateway" not in existing_cols:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN payment_gateway VARCHAR(50) DEFAULT 'Manual'"))
                    conn.commit()
                if "cf_order_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN cf_order_id VARCHAR(100) NULL"))
                    conn.commit()
                if "cf_payment_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN cf_payment_id VARCHAR(100) NULL"))
                    conn.commit()
    except Exception:
        pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
