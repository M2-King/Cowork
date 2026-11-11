import { useEffect, useState } from 'react';
import CodeEditor from './CodeEditor.jsx';
import Icon from './Icon.jsx';
import { RunControls, RuntimeError } from './RunControls.jsx';
import { IconButton, MenuButton, PreviewTag } from './ui.jsx';

function renderMarkdown(src) {
  return src.split(/\n{2,}/).map((block, i) => {
    const h = block.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      const Tag = `h${h[1].length + 1}`;
      return <Tag key={i}>{h[2]}</Tag>;
    }
    return <p key={i}>{block.split(/(`[^`]+`)/).map((part, j) => (part.startsWith('`') ? <code key={j}>{part.slice(1, -1)}</code> : part))}</p>;
  });
}

export default function NotebookView({ file, presence, onChangeCell, onAddCell, onDeleteCell, onRunCells, runtime, onStop, onRestart, onDownload }) {
  const [focusId, setFocusId] = useState(null);
  const [editingMd, setEditingMd] = useState(null);
  const busy = runtime.status === 'loading' || runtime.status === 'running';

  useEffect(() => {
    if (!focusId) return;
    const el = document.querySelector(`[data-cell="${focusId}"] textarea`);
    if (el) {
      el.focus();
      el.closest('[data-cell]')?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      setFocusId(null);
    }
  });

  function add(type, afterId) {
    const cell = onAddCell(type, afterId);
    if (type === 'markdown') setEditingMd(cell.id);
    setFocusId(cell.id);
  }

  const codeIds = file.cells.filter((c) => c.type === 'code').map((c) => c.id);

  return (
    <div className="nb-view">
      <div className="file-toolbar">
        <span className="file-toolbar__name">{file.name}</span>
        <RunControls runtime={runtime} onRun={() => onRunCells(codeIds)} onStop={onStop} onRestart={onRestart} runLabel="Run all" />
        <span className="file-toolbar__group">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => add('code')}>
            <Icon name="plus" /> Code
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => add('markdown')}>
            <Icon name="plus" /> Text
          </button>
        </span>
      </div>

      <div className="nb-view__scroll">
        {runtime.status === 'error' && (
          <RuntimeError error={runtime.error} isNotebook fileName={file.name} onDownload={onDownload} onRestart={onRestart} />
        )}
        <ol className="cells" aria-label={`Cells in ${file.name}`}>
          {file.cells.map((cell, idx) => {
            const isRunning = runtime.cellId === cell.id && busy;
            const cellPresence = presence && presence.cellId === cell.id ? presence : null;
            return (
              <li
                key={cell.id}
                data-cell={cell.id}
                className={`cell cell--${cell.type} ${isRunning ? 'is-running' : ''} ${cellPresence ? 'has-peer' : ''}`}
                style={cellPresence ? { '--person': cellPresence.person.color } : undefined}
                aria-label={`${cell.type === 'code' ? 'Code' : 'Text'} cell ${idx + 1}`}
              >
                <div className="cell__gutter">
                  {cell.type === 'code' ? (
                    <>
                      <IconButton
                        icon={isRunning ? 'stop' : 'play'}
                        label={isRunning ? `Stop cell ${idx + 1}` : `Run cell ${idx + 1} on this device`}
                        tooltipSide="right"
                        className={`cell__run ${isRunning ? 'is-running' : ''}`}
                        disabled={busy && !isRunning}
                        onClick={() => (isRunning ? onStop() : onRunCells([cell.id]))}
                      />
                      <span className="cell__count" aria-label={isRunning ? 'Running' : cell.count ? `Execution count ${cell.count}` : 'Not run'}>
                        [{isRunning || (cell.pending && busy) ? '*' : cell.count ?? ' '}]
                      </span>
                    </>
                  ) : (
                    <span className="cell__kind" aria-hidden="true">Text</span>
                  )}
                </div>

                <div className="cell__main">
                  {cellPresence && (
                    <span className="cell__peer">
                      {cellPresence.person.name} is editing <PreviewTag>Preview</PreviewTag>
                    </span>
                  )}
                  {cell.type === 'code' || editingMd === cell.id ? (
                    <div onBlur={(e) => cell.type === 'markdown' && !e.currentTarget.contains(e.relatedTarget) && setEditingMd(null)}>
                      <CodeEditor
                        autoHeight
                        lineNumbers={false}
                        language={cell.type === 'code' ? 'python' : 'markdown'}
                        value={cell.source}
                        label={`${cell.type === 'code' ? 'Code' : 'Text'} cell ${idx + 1}${cell.type === 'code' ? '. Shift+Enter runs the cell.' : ''}`}
                        presence={cellPresence}
                        onChange={(src) => onChangeCell(cell.id, src)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.shiftKey) {
                            e.preventDefault();
                            if (cell.type === 'code' && !busy) onRunCells([cell.id]);
                            if (cell.type === 'markdown') setEditingMd(null);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button type="button" className="md-render" onClick={() => { setEditingMd(cell.id); setFocusId(cell.id); }} aria-label={`Edit text cell ${idx + 1}`}>
                      {cell.source.trim() ? renderMarkdown(cell.source) : <span className="muted">Empty text cell. Select to edit.</span>}
                    </button>
                  )}

                  {cell.type === 'code' && isRunning && runtime.status === 'loading' && (
                    <div className="cell__out term term--muted"><span className="spinner" aria-hidden="true" /> Loading Python on this device…</div>
                  )}
                  {cell.output && !isRunning && <CellOutput output={cell.output} />}
                </div>

                <MenuButton
                  label={`Actions for cell ${idx + 1}`}
                  className="cell__menu"
                  items={[
                    { label: 'Add code cell below', icon: 'plus', onSelect: () => add('code', cell.id) },
                    { label: 'Add text cell below', icon: 'plus', onSelect: () => add('markdown', cell.id) },
                    { label: 'Delete cell', icon: 'trash', danger: true, onSelect: () => onDeleteCell(cell.id) },
                  ]}
                />
              </li>
            );
          })}
        </ol>
        <div className="cells__add">
          <button type="button" className="btn btn--ghost btn--small" onClick={() => add('code')}>
            <Icon name="plus" /> Code cell
          </button>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => add('markdown')}>
            <Icon name="plus" /> Text cell
          </button>
        </div>
        <p className="muted small nb-view__foot">
          Cells sync for everyone. Variables and outputs come from your own runtime on this device.
        </p>
      </div>
    </div>
  );
}

function CellOutput({ output }) {
  if (output.kind === 'error') {
    return (
      <div className="cell__out cell__out--error">
        <pre className="term">{output.error.name}: {output.error.message}</pre>
        {output.preview && <PreviewTag>Preview output</PreviewTag>}
      </div>
    );
  }
  return (
    <div className="cell__out">
      <pre className="term">{output.text || <span className="muted">{output.note ?? 'No output.'}</span>}</pre>
      <PreviewTag>{output.preview ? 'Preview output' : 'Fixture output'}</PreviewTag>
    </div>
  );
}
