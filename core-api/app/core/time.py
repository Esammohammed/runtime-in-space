"""Time helpers. The database stores naive UTC datetimes everywhere."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def humanize_seconds(seconds: float) -> str:
    if seconds < 10:
        return "a few seconds"
    if seconds < 90:
        return f"{round(seconds)} seconds"
    if seconds < 90 * 60:
        return f"{round(seconds / 60)} minutes"
    if seconds < 36 * 3600:
        return f"{round(seconds / 3600)} hours"
    return f"{round(seconds / 86400)} days"
