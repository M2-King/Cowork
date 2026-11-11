import { useRef, useState } from 'react';
import { PEOPLE } from '../fixtures.js';
import Icon, { FileIcon } from './Icon.jsx';
import { IconButton, MenuButton } from './ui.jsx';

export default function Sidebar({ files, activeId, onOpen, onNewPython, onNewNotebook, onImport, onRename, onDownload, onClose, presence }) {
  const [renaming, setRenaming] = useState(null);
  const importRef = useRef(null);

  return (
    <aside id="file-sidebar" className="sidebar" aria-label="Project files">
      <div className="sidebar__head">
        <h2 className="sidebar__title">Files</h2>
        <IconButton icon="close" label="Hide files" className="sidebar__close" onClick={onClose} />
      </div>
      <div className="sidebar__actions">
        <button type="button" className="btn btn--small btn--ghost" onClick={onNewPython}>
          <Icon name="plus" /> New file
        </button>
        <button type="button" className="btn btn--small btn--ghost" onClick={onNewNotebook}>
          <Icon name="notebook" /> New notebook
        </button>
        <button type="button" className="btn btn--small btn--ghost" onClick={() => importRef.current?.click()}>
          <Icon name="import" /> Import notebook
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".ipynb,application/x-ipynb+json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
      </div>

      <ul className="file-tree">
        {files.map((f) => {
          const p = presence[f.id];
          const person = p && PEOPLE[p.userId];
          const isActive = f.id === activeId;
          return (
            <li key={f.id} className={`file-row ${isActive ? 'is-active' : ''}`}>
              {renaming === f.id ? (
                <RenameInput
                  file={f}
                  taken={files.filter((x) => x.id !== f.id).map((x) => x.name)}
                  onDone={(name) => {
                    if (name) onRename(f.id, name);
                    setRenaming(null);
                  }}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="file-row__open"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => onOpen(f.id)}
                  >
                    <FileIcon kind={f.kind} />
                    <span className="truncate">{f.name}</span>
                    {person && (
                      <span className="presence-dot" style={{ '--person': person.color }} title={`${person.name} is here (preview)`}>
                        <span className="sr-only">, {person.name} is editing (preview)</span>
                      </span>
                    )}
                  </button>
                  <MenuButton
                    label={`Actions for ${f.name}`}
                    className="file-row__menu"
                    items={[
                      { label: 'Rename', icon: 'edit', onSelect: () => setRenaming(f.id) },
                      { label: f.kind === 'notebook' ? 'Download .ipynb' : 'Download', icon: 'download', onSelect: () => onDownload(f) },
                    ]}
                  />
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="sidebar__foot muted small">Shared with everyone in this project. Runtimes are per person.</p>
    </aside>
  );
}

function RenameInput({ file, taken, onDone }) {
  const [value, setValue] = useState(file.name);
  const [error, setError] = useState('');
  function commit() {
    const v = value.trim();
    if (!v || v === file.name) return onDone(null);
    if (taken.includes(v)) return setError('A file with that name already exists.');
    onDone(v);
  }
  return (
    <div className="rename">
      <label className="sr-only" htmlFor={`rename-${file.id}`}>Rename {file.name}</label>
      <input
        id={`rename-${file.id}`}
        autoFocus
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `rename-err-${file.id}` : undefined}
        onFocus={(e) => e.target.setSelectionRange(0, file.name.lastIndexOf('.') > 0 ? file.name.lastIndexOf('.') : file.name.length)}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') onDone(null);
        }}
        onBlur={commit}
      />
      {error && <span id={`rename-err-${file.id}`} className="rename__error">{error}</span>}
    </div>
  );
}
