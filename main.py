
# Make a simple todo list with sql data base for object permanence

import sqlite3
import datetime
import typer
from rich.console import Console
from prettytable import from_db_cursor
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal

# CLI app
cli = typer.Typer()
console = Console()

# FastAPI app
api = FastAPI()

# CORS for React dev server and deployed Vercel frontend.
# TODO: replace the placeholder URL below with your real Vercel URL,
# e.g. "https://your-todo-dashboard.vercel.app".
api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "https://todo-list-project-ivory.vercel.app",  # Vercel production frontend (placeholder)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path
DB_PATH = "todo.sql"

# function to connect to a SQL DataBase
def connectDB():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    return conn

# Dependency for FastAPI endpoints
def get_db():
    db = connectDB()
    try:
        yield db
    finally:
        db.close()

# Ensure table exists
def create_DB_Table():
    conn = connectDB()
    cursor = conn.cursor()
    SQL = """CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            task_name text NOT NULL,
            description text,
            status text DEFAULT 'pending',
            date_added DATE
        );"""
    cursor.execute(SQL)
    conn.commit()
    conn.close()

create_DB_Table()

# Pydantic models for validation
class TaskBase(BaseModel):
    task_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    status: Literal["pending", "done", "in-progress", "testing"] = Field("pending")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    task_name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    status: Optional[Literal["pending", "done", "in-progress", "testing"]]

class Task(TaskBase):
    id: int
    date_added: str

# FastAPI endpoints
@api.get("/tasks", response_model=List[Task])
def get_tasks(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id, task_name, description, status, date_added FROM tasks")
    rows = cursor.fetchall()
    return [
        Task(
            id=row[0],
            task_name=row[1],
            description=row[2],
            status=row[3],
            date_added=row[4],
        ) for row in rows
    ]

@api.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: sqlite3.Connection = Depends(get_db)):
    try:
        date_added = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO tasks (task_name, description, status, date_added) VALUES (?, ?, ?, ?)",
            (task.task_name, task.description, task.status, date_added)
        )
        db.commit()
        task_id = cursor.lastrowid
        if task_id is None:
            raise HTTPException(status_code=500, detail="Failed to retrieve task ID after insertion")
        return Task(id=task_id, date_added=date_added, **task.model_dump())
    except sqlite3.Error as e:
        # You could also log the error here
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}") # Changed **task.dict() -> **task.model_dump()

@api.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task: TaskUpdate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id, task_name, description, status, date_added FROM tasks WHERE id = ?", (task_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    # Prepare update
    new_task_name = task.task_name if task.task_name is not None else row[1]
    new_description = task.description if task.description is not None else row[2]
    new_status = task.status if task.status is not None else row[3]
    cursor.execute(
        "UPDATE tasks SET task_name = ?, description = ?, status = ? WHERE id = ?",
        (new_task_name, new_description, new_status, task_id)
    )
    db.commit()
    return Task(id=task_id, task_name=new_task_name, description=new_description, status=new_status, date_added=row[4])

@api.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM tasks WHERE id = ?", (task_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Task not found")
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    return

# Typer CLI commands (unchanged, but use connectDB for each command)
@cli.command()
def showList():
    conn = connectDB()
    cursor = conn.cursor()
    SQL = "SELECT id, task_name, description, status, date_added FROM tasks"
    cursor.execute(SQL)
    table = from_db_cursor(cursor)
    print(table)
    conn.close()
    return table

@cli.command()
def addItem(task_name: str, description: str):
    date_added = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    conn = connectDB()
    cursor = conn.cursor()
    SQL = "INSERT INTO tasks (task_name, description, status, date_added) VALUES (?, ?, 'pending', ?)"
    cursor.execute(SQL, (task_name, description, date_added))
    conn.commit()
    console.print("[green]Task added successfully")
    conn.close()

@cli.command()
def updateItem(task_id: int, new_status: str):
    conn = connectDB()
    cursor = conn.cursor()
    SQL = "UPDATE tasks SET status = ? WHERE id = ?"
    cursor.execute(SQL, (new_status, task_id))
    conn.commit()
    console.print("[yellow]Task updated successfully")
    conn.close()

@cli.command()
def removeItem(task_id: int):
    conn = connectDB()
    cursor = conn.cursor()
    SQL = "DELETE FROM tasks WHERE id = ?"
    cursor.execute(SQL, (task_id,))
    conn.commit()
    console.print("[red]Task removed successfully")
    conn.close()

# Main loop
if __name__ == "__main__":
    cli()

