from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_dashboard_stats():
    return {}
