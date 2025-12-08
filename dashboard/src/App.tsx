import { useEffect, useState } from 'react'
import './App.css'

// This interface describes the shape of a Task coming from the FastAPI backend.
// Keeping this in sync with the Pydantic `Task` model in main.py helps catch
// mismatches at compile time (e.g. missing fields, wrong types).
interface Task {
  id: number
  task_name: string
  description: string | null
  status: 'pending' | 'done' | 'in-progress'
  date_added: string
}

// For creating or editing a task we only need a subset of the fields.
// Using a separate type makes it clear which fields are editable from the UI.
interface TaskFormState {
  task_name: string
  description: string
  status: 'pending' | 'done' | 'in-progress'
}

// In a larger app we would usually move API logic into a separate module.
// For this small learning project we keep it in the same file so you can
// see everything in one place.
const API_BASE_URL = 'http://127.0.0.1:8000'

function App() {
  // All tasks currently loaded from the backend
  const [tasks, setTasks] = useState<Task[]>([])

  // Simple loading & error flags to give the user feedback
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for adding a new task
  const [newTask, setNewTask] = useState<TaskFormState>({
    task_name: '',
    description: '',
    status: 'pending',
  })

  // Track which task is currently being edited (by id) and its form values
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editingTask, setEditingTask] = useState<TaskFormState | null>(null)

  // Helper: load all tasks from the backend
  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`${API_BASE_URL}/tasks`)
      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.status}`)
      }
      const data: Task[] = await response.json()
      setTasks(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Load tasks once when the component first mounts.
  useEffect(() => {
    fetchTasks()
  }, [])

  // Add a new task by calling POST /tasks and then updating local state
  const handleAddTask = async () => {
    if (!newTask.task_name.trim()) {
      alert('Task name is required')
      return
    }

    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_name: newTask.task_name,
          description: newTask.description || null,
          status: newTask.status,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.status}`)
      }

      const createdTask: Task = await response.json()

      // Append the new task to the existing list instead of refetching.
      setTasks((prev) => [...prev, createdTask])

      // Reset the form for the next entry.
      setNewTask({ task_name: '', description: '', status: 'pending' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    }
  }

  // Begin editing by copying the task values into editingTask state
  const startEditing = (task: Task) => {
    setEditingTaskId(task.id)
    setEditingTask({
      task_name: task.task_name,
      description: task.description ?? '',
      status: task.status,
    })
  }

  // Cancel editing and clear state
  const cancelEditing = () => {
    setEditingTaskId(null)
    setEditingTask(null)
  }

  // Save edits via PUT /tasks/{id}
  const saveEditing = async () => {
    if (editingTaskId === null || !editingTask) return
    if (!editingTask.task_name.trim()) {
      alert('Task name is required')
      return
    }

    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_name: editingTask.task_name,
          description: editingTask.description || null,
          status: editingTask.status,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`)
      }

      const updatedTask: Task = await response.json()

      // Replace the old task in state with the updated one
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))

      cancelEditing()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    }
  }

  // Delete a task via DELETE /tasks/{id}
  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`)
      }

      // Filter removed task from local state
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Todo Dashboard</h1>
        <p className="app-subtitle">
          This frontend talks to the FastAPI backend at <code>{API_BASE_URL}</code>.
        </p>
      </header>

      {/* Add Task Section */}
      <section className="card">
        <h2>Add a new task</h2>
        <div className="form-row">
          <label>
            <span>Task name</span>
            <input
              type="text"
              value={newTask.task_name}
              onChange={(e) =>
                setNewTask((prev) => ({ ...prev, task_name: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Description</span>
            <input
              type="text"
              value={newTask.description}
              onChange={(e) =>
                setNewTask((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={newTask.status}
              onChange={(e) =>
                setNewTask((prev) => ({
                  ...prev,
                  status: e.target.value as TaskFormState['status'],
                }))
              }
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <button className="primary" onClick={handleAddTask}>
            + Add Task
          </button>
        </div>
      </section>

      {/* List Section */}
      <section className="card">
        <div className="card-header">
          <h2>Current tasks</h2>
          <button className="secondary" onClick={fetchTasks} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading && <p>Loading tasks...</p>}
        {error && <p className="error">Error: {error}</p>}

        {tasks.length === 0 && !loading ? (
          <p>No tasks found. Try adding one above.</p>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Date added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isEditing = task.id === editingTaskId && editingTask
                return (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTask!.task_name}
                          onChange={(e) =>
                            setEditingTask((prev) =>
                              prev
                                ? { ...prev, task_name: e.target.value }
                                : prev,
                            )
                          }
                        />
                      ) : (
                        task.task_name
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTask!.description}
                          onChange={(e) =>
                            setEditingTask((prev) =>
                              prev
                                ? { ...prev, description: e.target.value }
                                : prev,
                            )
                          }
                        />
                      ) : (
                        task.description
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editingTask!.status}
                          onChange={(e) =>
                            setEditingTask((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    status:
                                      e.target
                                        .value as TaskFormState['status'],
                                  }
                                : prev,
                            )
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      ) : (
                        task.status
                      )}
                    </td>
                    <td>{task.date_added}</td>
                    <td className="actions-cell">
                      {isEditing ? (
                        <>
                          <button className="primary" onClick={saveEditing}>
                            Save
                          </button>
                          <button className="secondary" onClick={cancelEditing}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="secondary"
                            onClick={() => startEditing(task)}
                          >
                            Edit
                          </button>
                          <button
                            className="danger"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default App
