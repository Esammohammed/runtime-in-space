from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Crew, Task
from app.routers.deps import get_crew
from app.schemas.crew import TaskOut
from app.services import tasks as task_service

router = APIRouter(tags=["tasks"])


@router.get("/crew/{crew_id}/tasks", response_model=list[TaskOut])
def list_tasks(crew: Crew = Depends(get_crew), db: Session = Depends(get_db)):
    return task_service.today_tasks(db, crew.id)


@router.post("/tasks/{task_id}/done", response_model=TaskOut)
def mark_done(task_id: int, db: Session = Depends(get_db)):
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    task.done = True
    db.commit()
    return task
