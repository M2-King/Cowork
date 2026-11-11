import { useCallback, useEffect, useRef, useState } from 'react';
import { REMOTE_PRESENCE, PEOPLE } from '../fixtures.js';
import { LOAD_MS, RUN_MS, simulate, unsupported } from '../runtime.js';
import { downloadFile, parseIpynb } from '../files.js';
import TopBar from './TopBar.jsx';
import Sidebar from './Sidebar.jsx';
import ShareDialog from './ShareDialog.jsx';
import PythonView from './PythonView.jsx';
import NotebookView from './NotebookView.jsx';
import CodeEditor from './CodeEditor.jsx';
import Icon from './Icon.jsx';
import { IconButton, LiveRegion, PreviewTag } from './ui.jsx';

let uid = 0;
const nextId = (p) => `${p}-${Date.now().toString(36)}-${uid++}`;

export default function Workspace({ project, projects, onOpenProject, onHome, onUpdate, theme, onToggleTheme, mark, apiRef }) {
  const files = project.files;
  const firstPy = files.find((f) => f.kind === 'python') ?? files[0];
  const [openIds, setOpenIds] = useState(() => [firstPy?.id].filter(Boolean));
  const [activeId, setActiveId] = useState(firstPy?.id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showPresence, setShowPresence] = useState(true);
  const [announce, setAnnounce] = useState('');

  // ---- Sync (simulated) -------------------------------------------------
  const [sync, setSync] = useState({ connection: 'online', saving: false, pending: 0 });
  const saveTimer = useRef(null);
  const noteEdit = useCallback(() => {
    setSync((s) => {
      if (s.connection !== 'online') return { ...s, pending: s.pending + 1 };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSync((x) => ({ ...x, saving: false })), 900);
      return { ...s, saving: true };
    });
  }, []);
  const reconnect = useCallback(() => {
    setSync({ connection: 'online', saving: true, pending: 0 });
    setAnnounce('Reconnected. Syncing pending changes.');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSync((x) => ({ ...x, saving: false })), 1000);
  }, []);
  const goReconnecting = useCallback((pending = 0) => {
    clearTimeout(saveTimer.current);
    setSync({ connection: 'reconnecting', saving: false, pending });
    setAnnounce('Connection lost. Reconnecting. Your edits are kept on this device.');
    mark('reconnecting');
  }, [mark]);

  // ---- Runtime (simulated, one per file per member) ----------------------
  const [runtimes, setRuntimes] = useState({}); // fileId -> { status, loaded, cellId, error }
  const [pyOutput, setPyOutput] = useState({}); // fileId -> { entries: [], open }
  const timers = useRef({});
  const counters = useRef({});
  const rt = (id) => runtimes[id] ?? { status: 'off', loaded: false };
  const patchRt = (id, patch) => setRuntimes((r) => ({ ...r, [id]: { status: 'off', loaded: false, ...r[id], ...patch } }));
  const clearTimer = (id) => clearTimeout(timers.current[id]);

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const updateFile = useCallback(
    (id, fn) => onUpdate((p) => ({ ...p, files: p.files.map((f) => (f.id === id ? fn(f) : f)) })),
    [onUpdate],
  );

  /** Run a list of jobs [{cellId?, source}] sequentially in the file's simulated runtime. */
  function execute(fileId, jobs, onResult) {
    clearTimer(fileId);
    const start = (i) => {
      if (i >= jobs.length) {
        patchRt(fileId, { status: 'idle', cellId: null });
        return;
      }
      const job = jobs[i];
      patchRt(fileId, { status: 'running', cellId: job.cellId ?? null, error: null });
      timers.current[fileId] = setTimeout(() => {
        const result = simulate(job.source);
        onResult(job, result);
        if (!result.ok) {
          patchRt(fileId, { status: 'error', cellId: null, error: result.error });
          setAnnounce(`Error: ${result.error.name}: ${result.error.message}`);
          if (result.error.unsupported) mark('runtime-error');
          return;
        }
        start(i + 1);
      }, RUN_MS);
    };
    if (!rt(fileId).loaded) {
      patchRt(fileId, { status: 'loading', cellId: jobs[0]?.cellId ?? null, error: null });
      setAnnounce('Loading Python on this device.');
      timers.current[fileId] = setTimeout(() => {
        patchRt(fileId, { loaded: true });
        start(0);
      }, LOAD_MS);
    } else {
      start(0);
    }
  }

  function stop(fileId) {
    clearTimer(fileId);
    patchRt(fileId, { status: 'stopped', cellId: null });
    setAnnounce('Execution stopped.');
  }

  function restart(fileId) {
    clearTimer(fileId);
    counters.current[fileId] = 0;
    const file = files.find((f) => f.id === fileId);
    if (file?.kind === 'notebook') {
      updateFile(fileId, (f) => ({ ...f, cells: f.cells.map((c) => (c.type === 'code' ? { ...c, count: null } : c)) }));
    }
    patchRt(fileId, { status: 'loading', loaded: false, error: null, cellId: null });
    setAnnounce('Restarting Python on this device. Variables were cleared.');
    timers.current[fileId] = setTimeout(() => patchRt(fileId, { status: 'idle', loaded: true }), LOAD_MS);
  }

  function runPython(file) {
    setPyOutput((o) => ({ ...o, [file.id]: { entries: [], open: true } }));
    execute(file.id, [{ source: file.text }], (_job, result) => {
      setPyOutput((o) => ({ ...o, [file.id]: { entries: [result], open: true } }));
    });
  }

  function runCells(file, cellIds) {
    const jobs = file.cells
      .filter((c) => cellIds.includes(c.id) && c.type === 'code')
      .map((c) => ({ cellId: c.id, source: c.source }));
    if (!jobs.length) return;
    updateFile(file.id, (f) => ({
      ...f,
      cells: f.cells.map((c) => (cellIds.includes(c.id) && c.type === 'code' ? { ...c, output: null, pending: true } : c)),
    }));
    execute(file.id, jobs, (job, result) => {
      // Continue numbering after any saved execution counts (e.g. from the fixture or an import).
      counters.current[file.id] =
        (counters.current[file.id] ?? Math.max(0, ...file.cells.map((c) => c.count ?? 0))) + 1;
      const count = counters.current[file.id];
      if (job.source.trim() === '6 * 7' && result.text === '42') mark('run-42');
      updateFile(file.id, (f) => ({
        ...f,
        cells: f.cells.map((c) =>
          c.id === job.cellId
            ? { ...c, count, pending: false, output: result.ok ? { kind: 'text', text: result.text, note: result.note, preview: true } : { kind: 'error', error: result.error, preview: true } }
            : c,
        ),
      }));
    });
  }

  // ---- Files -------------------------------------------------------------
  const active = files.find((f) => f.id === activeId);

  function openFile(id) {
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActiveId(id);
    setDrawerOpen(false);
    const f = files.find((x) => x.id === id);
    if (f?.kind === 'python') mark('open-py');
    if (f?.kind === 'notebook') mark('open-nb');
  }

  function closeTab(id) {
    const idx = openIds.indexOf(id);
    const rest = openIds.filter((x) => x !== id);
    setOpenIds(rest);
    if (activeId === id) setActiveId(rest[Math.max(0, idx - 1)] ?? null);
  }

  function uniqueName(base, ext) {
    let name = `${base}${ext}`;
    let n = 2;
    while (files.some((f) => f.name === name)) name = `${base}_${n++}${ext}`;
    return name;
  }

  function addFile(file) {
    onUpdate((p) => ({ ...p, files: [...p.files, file] }));
    setOpenIds((ids) => [...ids, file.id]);
    setActiveId(file.id);
    setDrawerOpen(false);
    noteEdit();
    return file;
  }

  const newPython = () => addFile({ id: nextId('f'), name: uniqueName('untitled', '.py'), kind: 'python', text: '' });
  const newNotebook = () =>
    addFile({ id: nextId('f'), name: uniqueName('untitled', '.ipynb'), kind: 'notebook', cells: [{ id: nextId('c'), type: 'code', source: '' }] });

  async function importNotebook(fileObj) {
    try {
      const cells = parseIpynb(await fileObj.text(), () => nextId('c'));
      addFile({ id: nextId('f'), name: uniqueName(fileObj.name.replace(/\.ipynb$/i, ''), '.ipynb'), kind: 'notebook', cells });
      setAnnounce(`Imported ${fileObj.name}.`);
    } catch (err) {
      setAnnounce(`Could not import ${fileObj.name}: ${err.message}`);
      window.alert(`Could not import ${fileObj.name}: ${err.message}`);
    }
  }

  function renameFile(id, name) {
    updateFile(id, (f) => ({ ...f, name }));
    noteEdit();
  }

  // ---- Notebook cell edits ---------------------------------------------------
  function setCellSource(fileId, cellId, source) {
    updateFile(fileId, (f) => ({ ...f, cells: f.cells.map((c) => (c.id === cellId ? { ...c, source } : c)) }));
    noteEdit();
  }
  function addCell(fileId, type, afterId, source = '') {
    const cell = { id: nextId('c'), type, source };
    updateFile(fileId, (f) => {
      const cells = [...f.cells];
      const at = afterId ? cells.findIndex((c) => c.id === afterId) + 1 : cells.length;
      cells.splice(at, 0, cell);
      return { ...f, cells };
    });
    noteEdit();
    if (type === 'code') mark('add-cell');
    return cell;
  }
  function deleteCell(fileId, cellId) {
    updateFile(fileId, (f) => ({ ...f, cells: f.cells.filter((c) => c.id !== cellId) }));
    noteEdit();
  }

  // ---- Prototype controls (used by the dock) ----------------------------------
  const pendingRun = useRef(null);
  useEffect(() => {
    // Runs a cell added by "Do it for me" once it exists in project state.
    if (!pendingRun.current) return;
    const { fileId, cellId } = pendingRun.current;
    const f = files.find((x) => x.id === fileId);
    if (f?.cells.some((c) => c.id === cellId)) {
      pendingRun.current = null;
      runCells(f, [cellId]);
    }
  });

  apiRef.current = {
    activeName: active?.name,
    activeKind: active?.kind,
    sync,
    runtime: active ? rt(active.id).status : null,
    showPresence,
    openByKind(kind) {
      const f = files.find((x) => x.kind === kind);
      if (f) openFile(f.id);
    },
    openShare() { setShareOpen(true); mark('share'); },
    setSync(state) {
      if (state === 'saved') { clearTimeout(saveTimer.current); setSync({ connection: 'online', saving: false, pending: 0 }); }
      if (state === 'saving') { clearTimeout(saveTimer.current); setSync({ connection: 'online', saving: true, pending: 0 }); }
      if (state === 'reconnecting') goReconnecting(0);
      if (state === 'pending') goReconnecting(3);
    },
    setRuntime(status) {
      if (!active || active.kind === 'markdown') return;
      clearTimer(active.id);
      const firstCode = active.cells?.find((c) => c.type === 'code')?.id ?? null;
      if (status === 'error') {
        const err = unsupported('torch').error;
        patchRt(active.id, { status: 'error', error: err, cellId: null });
        if (active.kind === 'python') setPyOutput((o) => ({ ...o, [active.id]: { entries: [{ ok: false, error: err }], open: true } }));
        mark('runtime-error');
      } else {
        patchRt(active.id, {
          status,
          error: null,
          loaded: status !== 'off' && status !== 'loading',
          cellId: status === 'running' || status === 'loading' ? firstCode : null,
        });
      }
    },
    togglePresence() { setShowPresence((v) => !v); },
    demoSixTimesSeven() {
      let nb = active?.kind === 'notebook' ? active : files.find((f) => f.kind === 'notebook');
      if (!nb) return;
      openFile(nb.id);
      const cell = addCell(nb.id, 'code', null, '6 * 7');
      pendingRun.current = { fileId: nb.id, cellId: cell.id };
    },
  };

  const presenceFor = (fileId) => {
    const p = showPresence && REMOTE_PRESENCE[fileId];
    return p ? { ...p, person: PEOPLE[p.userId] } : null;
  };

  const runtimeProps = active && {
    runtime: rt(active.id),
    onStop: () => stop(active.id),
    onRestart: () => restart(active.id),
    onDownload: () => downloadFile(active),
  };

  return (
    <div className={`workspace ${drawerOpen ? 'drawer-open' : ''}`}>
      <LiveRegion message={announce} />
      <TopBar
        project={project}
        projects={projects}
        onOpenProject={onOpenProject}
        onHome={onHome}
        sync={sync}
        onReconnect={reconnect}
        onShare={() => { setShareOpen(true); mark('share'); }}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        drawerOpen={drawerOpen}
        theme={theme}
        onToggleTheme={onToggleTheme}
        files={files}
      />
      <div className="workspace__body">
        <Sidebar
          files={files}
          activeId={activeId}
          onOpen={openFile}
          onNewPython={newPython}
          onNewNotebook={newNotebook}
          onImport={importNotebook}
          onRename={renameFile}
          onDownload={(f) => downloadFile(f)}
          onClose={() => setDrawerOpen(false)}
          presence={showPresence ? REMOTE_PRESENCE : {}}
        />
        {drawerOpen && <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}

        <main id="main" className="editor-area" tabIndex={-1}>
          <div className="tabs" role="tablist" aria-label="Open files">
            {openIds.map((id) => {
              const f = files.find((x) => x.id === id);
              if (!f) return null;
              const selected = id === activeId;
              return (
                <div key={id} className={`tab ${selected ? 'is-active' : ''}`}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="editor-panel"
                    className="tab__label"
                    onClick={() => openFile(id)}
                  >
                    <Icon name={f.kind === 'notebook' ? 'notebook' : f.kind === 'markdown' ? 'markdown' : 'file'} />
                    <span className="truncate">{f.name}</span>
                  </button>
                  <IconButton icon="close" label={`Close ${f.name}`} className="tab__close" onClick={() => closeTab(id)} />
                </div>
              );
            })}
          </div>

          {sync.connection === 'reconnecting' && (
            <div className="banner banner--warn" role="status">
              <Icon name="cloudOff" />
              <span>
                <strong>Reconnecting…</strong> You can keep editing. {sync.pending > 0 ? `${sync.pending} ${sync.pending === 1 ? 'change is' : 'changes are'} kept on this device` : 'Changes are kept on this device'} and will sync when the connection returns.
              </span>
              <PreviewTag>Simulated</PreviewTag>
              <button type="button" className="btn btn--small" onClick={reconnect}>Retry now</button>
            </div>
          )}

          <section id="editor-panel" role="tabpanel" aria-label={active ? active.name : 'No file open'} className="editor-panel">
            {!active && (
              <div className="empty empty--editor">
                <h2>No file open</h2>
                <p className="muted">Choose a file from the sidebar, or create a new one.</p>
                <button type="button" className="btn" onClick={() => setDrawerOpen(true)}>
                  <Icon name="folder" /> Browse files
                </button>
              </div>
            )}
            {active?.kind === 'python' && (
              <PythonView
                file={active}
                presence={presenceFor(active.id)}
                onChange={(text) => { updateFile(active.id, (f) => ({ ...f, text })); noteEdit(); }}
                onRun={() => runPython(active)}
                output={pyOutput[active.id] ?? { entries: [], open: false }}
                onToggleOutput={() => setPyOutput((o) => ({ ...o, [active.id]: { entries: [], ...o[active.id], open: !(o[active.id]?.open) } }))}
                onClearOutput={() => setPyOutput((o) => ({ ...o, [active.id]: { entries: [], open: true } }))}
                {...runtimeProps}
              />
            )}
            {active?.kind === 'notebook' && (
              <NotebookView
                file={active}
                presence={presenceFor(active.id)}
                onChangeCell={(cellId, src) => setCellSource(active.id, cellId, src)}
                onAddCell={(type, afterId) => addCell(active.id, type, afterId)}
                onDeleteCell={(cellId) => deleteCell(active.id, cellId)}
                onRunCells={(ids) => runCells(active, ids)}
                {...runtimeProps}
              />
            )}
            {active?.kind === 'markdown' && (
              <div className="doc-view">
                <div className="file-toolbar">
                  <span className="file-toolbar__name">{active.name}</span>
                  <span className="muted small">Markdown · no runtime</span>
                </div>
                <CodeEditor
                  value={active.text}
                  language="markdown"
                  label={`Edit ${active.name}`}
                  onChange={(text) => { updateFile(active.id, (f) => ({ ...f, text })); noteEdit(); }}
                />
              </div>
            )}
          </section>
        </main>
      </div>

      {shareOpen && (
        <ShareDialog
          project={project}
          onClose={() => setShareOpen(false)}
          onInvite={(email) => {
            onUpdate((p) => ({ ...p, invitations: [...p.invitations, { id: nextId('i'), email, sent: 'Just now · preview' }] }));
            mark('invite');
          }}
          onRevoke={(id) => onUpdate((p) => ({ ...p, invitations: p.invitations.filter((i) => i.id !== id) }))}
        />
      )}
    </div>
  );
}
