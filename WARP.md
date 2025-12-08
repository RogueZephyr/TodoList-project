# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Tooling and common commands

This repo has two main parts:
- A Python backend/CLI in the repository root (FastAPI + Typer + SQLite).
- A React + TypeScript + Vite frontend in the `dashboard` subdirectory.

### Python backend / CLI (root)

All Python backend and CLI code currently lives in `main.py`, configured via `pyproject.toml` (project name `automation`). The backend exposes a FastAPI app and a Typer-based CLI that both operate on the same SQLite database (`todo.sql`).

#### Python dependencies

Use your preferred Python environment manager. From the repo root:

- Install the package and dependencies in editable mode (if using `uv`):
  - `uv sync`
- Or using `pip` directly from `pyproject.toml`:
  - `pip install -e .`

#### Running the FastAPI server

The FastAPI app instance is named `api` in `main.py`. A typical Uvicorn command (from the repo root) is:

- `uvicorn main:api --reload`

This will start the HTTP API (default `http://127.0.0.1:8000`) exposing:
- `GET /tasks` – list tasks.
- `POST /tasks` – create a task.
- `PUT /tasks/{task_id}` – update a task.
- `DELETE /tasks/{task_id}` – delete a task.

CORS is configured to allow calls from the Vite dev server at `http://localhost:5173`.

#### Using the Typer CLI

The Typer CLI entrypoint is `cli` in `main.py`. From the repo root:

- Show all tasks: `python -m main showList`
- Add a task: `python -m main addItem "Task name" "Task description"`
- Update a task status: `python -m main updateItem TASK_ID NEW_STATUS`
- Remove a task: `python -m main removeItem TASK_ID`

> Note: `DB_PATH` is `todo.sql` in the repo root. The database and `tasks` table are created automatically on import via `create_DB_Table()`.

### Frontend (dashboard)

From the repository root, `cd dashboard` before running any of these commands.

### Dependency installation

Use a Node.js package manager to install dependencies:

- With Bun (preferred, a `bun.lock` file is present):
  - `bun install`
- With npm:
  - `npm install`

### Development server

- Start the dev server with hot module reloading:
  - `bun run dev`
  - or `npm run dev`

### Build

- Type-check and build the production bundle:
  - `bun run build`
  - or `npm run build`

### Linting

- Run ESLint on the entire project:
  - `bun run lint`
  - or `npm run lint`

### Previewing a production build

- After building, preview the production bundle locally:
  - `bun run preview`
  - or `npm run preview`

### Tests

A JavaScript/TypeScript test runner (e.g., Vitest or Jest) is **not** currently configured in `package.json`, so there is no standard `test` or single-test command yet. If a test runner is added, update this section with:

- The command to run the full test suite.
- An example command to run a single test file or test name.

## High-level architecture

### Overall structure

- Root directory
  - `main.py`: Python FastAPI backend and Typer CLI operating on a shared SQLite database (`todo.sql`).
  - `pyproject.toml`: Python project metadata and backend dependencies.
  - `dashboard/`: Vite-based React + TypeScript frontend application.

### Frontend application (dashboard)

- **Entry point**: `dashboard/src/main.tsx`
  - Imports global styles from `index.css`.
  - Creates a React root on the DOM element with id `root`.
  - Renders the top-level `App` component inside `React.StrictMode`.

- **Root component**: `dashboard/src/App.tsx`
  - Implements the default Vite + React starter UI.
  - Demonstrates a simple `useState` counter (`count`) and a button that increments it.
  - Shows Vite and React logos and instructs editing `src/App.tsx` to experiment with HMR.
  - This file is the primary place to start when adding new UI components and routing.

- **Assets and styling**:
  - `dashboard/src/assets/`: Static assets such as `react.svg`.
  - `dashboard/src/App.css` and `dashboard/src/index.css`: Global and component-level styles used by `App` and the root.

### Build and tooling configuration

- **Vite config**: `dashboard/vite.config.ts`
  - Uses `@vitejs/plugin-react` for React fast refresh and JSX/TSX support.
  - No custom aliases or build options are defined yet; Vite is running with its default behavior.

- **TypeScript config**:
  - `dashboard/tsconfig.json` is a project reference root that points to:
    - `tsconfig.app.json` (app source configuration).
    - `tsconfig.node.json` (Node/build tooling configuration).
  - This setup separates browser-targeted code from Node-based build tooling and scripts.

- **ESLint**:
  - `dashboard/eslint.config.js` defines the lint configuration used by the `lint` script.
  - The included `dashboard/README.md` notes that the configuration currently does **not** enable type-aware lint rules; switching to `typescript-eslint` type-checked configs and React-specific plugins is recommended for production apps.

### README highlights relevant for agents

- `dashboard/README.md` documents that this project is the standard React + TypeScript + Vite template.
- The React Compiler is **not** enabled; enabling it would require additional configuration as described in that README.
- The README includes guidance on expanding ESLint to use type-aware rules and additional React-focused plugins (`eslint-plugin-react-x`, `eslint-plugin-react-dom`) if stricter linting is desired.

## Notes for future Warp agents

- This is explicitly a learning project. When making changes, prioritize clarity and education over compactness or heavy abstraction.
- Prefer incremental, easy-to-follow changes and include brief "guide" comments in code when introducing new concepts, patterns, or non-obvious behavior (e.g., how FastAPI dependency injection works, how React state flows, why a certain SQL query is written in a particular way).
- When you implement a larger feature or refactor, consider structuring your edits as small, logical steps and explain them in your response so the user can follow along.
- Focus your changes under `dashboard/src/` unless explicitly asked to modify tooling or configuration.
- When adding significant new UI structure (routing, layout, state management), start from `dashboard/src/App.tsx` and consider introducing additional modules under `dashboard/src/` to keep concerns separated (e.g., `components/`, `pages/`, `hooks/`).
- If you introduce a test runner, update `package.json` scripts and this `WARP.md` with clear test commands, including how to run a single test.
