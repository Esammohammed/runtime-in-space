from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer


def _iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


# Datetimes leave the API as ISO strings ending in Z.
UtcDateTime = Annotated[datetime, PlainSerializer(_iso_utc, return_type=str)]
