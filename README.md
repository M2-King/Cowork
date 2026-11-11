# Cowork

A shared workspace where a small team (about five people) edits Python files and notebooks together in the browser. "Cowork" is the working name.

**Status: Phase 1, a clickable UI prototype running entirely on fixture data.** It has no backend, sign-in, persistence, real-time sync, or Python execution yet. Review this phase before starting Milestone 2.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static build in dist/
```

Automated walkthrough (Playwright, which must already be installed):

```bash
npm run build && npx vite preview --port 4173 &
npm run walkthrough  # clicks through all steps, runs 21 checks, writes docs/screenshots/
```

## Walkthrough

A **Prototype guide** panel (bottom right; collapses to a pill) tracks each step and offers a **Show** shortcut. Its **Fixture states** tab switches the sync and runtime states directly.

1. **Navigate.** On **Projects**, open **Data Study**. It opens straight into the workspace on `clean_data.py`. Pick `analysis.ipynb` in the file tree, switch tabs, then use **Projects** in the breadcrumb (or the project switcher ▾) to go back.
2. **Share.** Select **Share**. The owner (you, Alex) sits apart from the members, and `taylor@example.com` is a pending invitation. Enter an email and select **Invite as member** to preview a new pending invitation; no email is sent. Open **Survey Pipeline**, where you are a member, to see the read-only view.
3. **Run a cell.** In `analysis.ipynb`, select **+ Code cell**, type `6 * 7`, then press **Shift+Enter** or ▷. The first run shows *Loading Python…* and then `42` with a *Preview output* label. In `clean_data.py`, **Run on this device** (or Ctrl/⌘+Enter) fills the collapsible Output panel.
4. **States and access.** Under **Fixture states**, choose **Changes pending** or **Reconnecting** to show the warning banner and the top-bar status (**Retry now** reconnects). Choose **Error** to show `ModuleNotFoundError: torch` with **Download .ipynb** and **Restart runtime**. Running a cell with `import torch` triggers the same state. Try Tab, Enter, Esc, and the arrow keys in the menus, then narrow the window below 760 px to see the file drawer.

## Fixture vs implemented

| Area | In this prototype |
| --- | --- |
| Projects, members, presence, activity | **Fixture data**, labeled *Preview* or *Fixture data* |
| New project, invitations, revoke | Simulated; lives only in this tab |
| Teammate cursor and selection | Simulated (Priya in `clean_data.py`, Sam in a notebook cell) |
| Saving / Saved / Reconnecting / Changes pending | Simulated timers and fixture controls |
| Python runs (loading, running, stopped, error) | **Simulated.** No Python runs. Arithmetic like `6 * 7` and fixture cells return canned output. |
| File editing, new file/notebook, rename, tabs | Works in memory; nothing is saved |
| Download (`.py`, `.md`, `.ipynb` export) and **Import notebook** | Really works, entirely in the browser, on the in-memory content |

## Screenshots

`docs/screenshots/` has desktop shots at 1440×900 (home, Python file with a teammate cursor, notebook, runtime loading, output, share dialog, `6 * 7 → 42`, reconnecting plus runtime error, dark theme) and mobile shots on an iPhone 13 (home, workspace, file drawer, notebook, run, share).

## Layout of the code

- `src/fixtures.js`: the Data Study fixture (all sample data in one place)
- `src/runtime.js`: the simulated runtime, which Milestone 4 replaces with an isolated browser runtime
- `src/components/CodeEditor.jsx`: a lightweight editor surface and the place where the CodeMirror and Yjs awareness integration goes in Milestone 3
- `src/components/*`: Home, Workspace, TopBar, Sidebar, ShareDialog, PythonView, NotebookView, RunControls, PrototypeDock

## Next milestones (not started)

2. Private project data: sign-in, persistence, invitations, and owner/member checks on the server
3. Live collaboration: Yjs, awareness, durable saves, reconnect recovery
4. Local Python: browser runtime in an isolated context, with stop and restart, bounded output, and `.ipynb` import/export
5. Release
