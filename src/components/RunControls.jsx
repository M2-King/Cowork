import { RUNTIME_LABELS } from '../runtime.js';
import Icon from './Icon.jsx';
import { PreviewTag } from './ui.jsx';

export function RunControls({ runtime, onRun, onStop, onRestart, runLabel = 'Run', runHint }) {
  const busy = runtime.status === 'loading' || runtime.status === 'running';
  return (
    <div className="run-controls" role="toolbar" aria-label="Python runtime controls">
      <button type="button" className="btn btn--primary btn--run" onClick={onRun} disabled={busy} aria-keyshortcuts={runHint?.keys} title={runHint?.title}>
        <Icon name="play" />
        <span>{runLabel}</span>
        <span className="btn__sub">on this device</span>
      </button>
      <button type="button" className="btn btn--ghost" onClick={onStop} disabled={!busy} aria-label="Stop" data-tooltip="Stop (interrupt)">
        <Icon name="stop" />
        <span className="btn__text">Stop</span>
      </button>
      <button type="button" className="btn btn--ghost" onClick={onRestart} disabled={runtime.status === 'off' || runtime.status === 'loading'} aria-label="Restart" data-tooltip="Restart runtime (clears variables)">
        <Icon name="restart" />
        <span className="btn__text">Restart</span>
      </button>
      <RuntimeChip status={runtime.status} />
    </div>
  );
}

export function RuntimeChip({ status }) {
  return (
    <span className={`rt-chip rt-chip--${status}`} role="status" aria-live="polite">
      <span className="rt-chip__dot" aria-hidden="true" />
      <Icon name="cpu" />
      <span className="rt-chip__text">
        <span className="sr-only">Python runtime on this device: </span>
        {RUNTIME_LABELS[status]}
      </span>
      <span className="rt-chip__where" aria-hidden="true">This device</span>
    </span>
  );
}

export function RuntimeError({ error, isNotebook, fileName, onDownload, onRestart }) {
  if (!error) return null;
  return (
    <div className="rt-error" role="alert">
      <Icon name="alert" />
      <div className="rt-error__body">
        <p className="rt-error__title">
          <code>{error.name}: {error.message}</code> <PreviewTag>Simulated error</PreviewTag>
        </p>
        {error.unsupported ? (
          <p className="small">
            <strong>{error.unsupported}</strong> isn't available in the Python runtime on this device.
            {isNotebook ? ' Download the notebook to run it in Jupyter or another full Python environment.' : ' Download the file to run it in a full Python environment.'}
          </p>
        ) : (
          <p className="small">Fix the code and run again, or restart the runtime.</p>
        )}
        <div className="rt-error__actions">
          {error.unsupported && (
            <button type="button" className="btn btn--small" onClick={onDownload}>
              <Icon name="download" /> {isNotebook ? 'Download .ipynb' : `Download ${fileName}`}
            </button>
          )}
          <button type="button" className="btn btn--small btn--ghost" onClick={onRestart}>
            <Icon name="restart" /> Restart runtime
          </button>
        </div>
      </div>
    </div>
  );
}
