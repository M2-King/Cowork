import CodeEditor from './CodeEditor.jsx';
import Icon from './Icon.jsx';
import { RunControls, RuntimeError } from './RunControls.jsx';
import { IconButton, PreviewTag } from './ui.jsx';

export default function PythonView({ file, presence, onChange, onRun, runtime, onStop, onRestart, onDownload, output, onToggleOutput, onClearOutput }) {
  const busy = runtime.status === 'loading' || runtime.status === 'running';
  return (
    <div className="py-view">
      <div className="file-toolbar">
        <span className="file-toolbar__name">{file.name}</span>
        <RunControls
          runtime={runtime}
          onRun={onRun}
          onStop={onStop}
          onRestart={onRestart}
          runLabel="Run"
          runHint={{ keys: 'Control+Enter Meta+Enter', title: 'Run file on this device (Ctrl/⌘+Enter)' }}
        />
      </div>
      <div className="py-view__editor">
        <CodeEditor
          value={file.text}
          onChange={onChange}
          label={`Edit ${file.name}`}
          presence={presence}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (!busy) onRun();
            }
          }}
        />
      </div>
      <section className={`output-panel ${output.open ? 'is-open' : ''}`} aria-label="Output">
        <div className="output-panel__head">
          <button type="button" className="output-panel__toggle" aria-expanded={output.open} aria-controls={`out-${file.id}`} onClick={onToggleOutput}>
            <Icon name={output.open ? 'chevronDown' : 'chevronRight'} />
            Output
            {runtime.status === 'error' && <span className="badge badge--danger">Error</span>}
          </button>
          <span className="spacer" />
          {output.open && output.entries.length > 0 && <PreviewTag>Preview output</PreviewTag>}
          {output.open && <IconButton icon="trash" label="Clear output" onClick={onClearOutput} />}
        </div>
        {output.open && (
          <div id={`out-${file.id}`} className="output-panel__body">
            {runtime.status === 'loading' && <p className="term term--muted"><span className="spinner" aria-hidden="true" /> Loading Python on this device…</p>}
            {runtime.status === 'running' && <p className="term term--muted"><span className="spinner" aria-hidden="true" /> Running {file.name}…</p>}
            {runtime.status === 'stopped' && <p className="term term--muted">KeyboardInterrupt: execution stopped.</p>}
            {output.entries.map((r, i) =>
              r.ok ? (
                <pre key={i} className="term">{r.text || <span className="muted">{r.note ?? 'Finished with no output.'}</span>}</pre>
              ) : null,
            )}
            {runtime.status === 'error' && (
              <RuntimeError error={runtime.error} fileName={file.name} onDownload={onDownload} onRestart={onRestart} />
            )}
            {!busy && runtime.status !== 'error' && runtime.status !== 'stopped' && output.entries.length === 0 && (
              <p className="term term--muted">Run the file to see output here. Python runs on this device, separately for each person.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
