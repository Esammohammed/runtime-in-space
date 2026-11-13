"""The six tables. See the project doc for what each one holds."""
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utcnow
from app.db.database import Base


class Crew(Base):
    __tablename__ = "crew"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(100), default="")
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    baselines: Mapped[dict] = mapped_column(JSON, default=dict)


class Reading(Base):
    """One measured value. A band packet with four values becomes four rows."""

    __tablename__ = "readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    crew_id: Mapped[int] = mapped_column(ForeignKey("crew.id"), index=True)
    indicator: Mapped[str] = mapped_column(String(50), index=True)
    value: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(20), default="simulator")
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)


class Assessment(Base):
    """The system's verdict on one reading."""

    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reading_id: Mapped[int] = mapped_column(ForeignKey("readings.id"), index=True)
    crew_id: Mapped[int] = mapped_column(ForeignKey("crew.id"), index=True)
    indicator: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(10))  # green | yellow | red
    reason: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    crew_id: Mapped[int] = mapped_column(ForeignKey("crew.id"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(200))
    indicator: Mapped[str | None] = mapped_column(String(50), nullable=True)
    origin: Mapped[str] = mapped_column(String(20), default="routine")  # routine | warning
    done: Mapped[bool] = mapped_column(Boolean, default=False)


class Event(Base):
    """Timestamped log: warnings fired, emergency steps taken."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    crew_id: Mapped[int] = mapped_column(ForeignKey("crew.id"), index=True)
    type: Mapped[str] = mapped_column(String(30), index=True)  # early_warning | emergency | status_change
    indicator: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str] = mapped_column(String(500))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    crew_id: Mapped[int] = mapped_column(ForeignKey("crew.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(20), default="queued")  # queued | sent | answered
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
