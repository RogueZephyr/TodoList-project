# Make a simple todo list with sql data base for object permanence

import sqlite3
import datetime
import typer
from rich.console import Console
from prettytable import from_db_cursor
import fastapi

# Object section
app = typer.Typer()
console = Console()

# Database path
DB_PATH = "todo.sql"

# function to connect to a SQL DataBase
def connectDB(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    return conn

# global database connection
conn = connectDB(DB_PATH)

#function to verify the existence of a table
def create_DB_Table():
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

# function to update the status of an item
@app.command()
def updateItem(task_id: int, new_status: str):
    cursor = conn.cursor()
    SQL = "UPDATE tasks SET status = ? WHERE id = ?"
    cursor.execute(SQL, (new_status, task_id))
    conn.commit()

# function to show todo list items
@app.command()
def showList():
    cursor = conn.cursor()
    SQL = "SELECT id, task_name, description, status, date_added FROM tasks"
    cursor.execute(SQL)
    table = from_db_cursor(cursor)
    print(table) 
    

# function to add items to list
@app.command()
def addItem(task_name: str, description: str):
    date_added = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    cursor = conn.cursor()
    SQL = "INSERT INTO tasks (task_name, description, status, date_added) VALUES (?, ?, 'pending', ?)"
    cursor.execute(SQL, (task_name, description, date_added))
    conn.commit()
    console.print("[green]Task added successfully")

# function to remove items from list
@app.command()
def removeItem(task_id: int):
    cursor = conn.cursor()
    SQL = "DELETE FROM tasks WHERE id = ?"
    cursor.execute(SQL, (task_id,))
    conn.commit()
    console.print("[red]Task removed successfully")

# Main loop
if __name__ == "__main__":
    app()

