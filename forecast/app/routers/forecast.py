from fastapi import APIRouter

from app.schemas.forecast import ForecastIn, ForecastOut
from app.services.analysis import analyse

router = APIRouter(tags=["forecast"])


@router.post("/forecast", response_model=ForecastOut)
def forecast(request: ForecastIn):
    """Forecast one indicator series and say when it leaves the green and yellow zones."""
    return analyse(request)
