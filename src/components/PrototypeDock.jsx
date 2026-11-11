import { useState } from 'react';
import Icon from './Icon.jsx';
import { IconButton } from './ui.jsx';

const STEPS = [
  {
    title: 'Navigate the project',
    items: [
      { id: 'open-py', text: 'Open clean_data.py', go: (a) => a.ws('openByKind', 'python') },
      { id: 'open-nb', text: 'Switch to analysis.ipynb', go: (a) => a.ws('openByKind', 'notebook') },
      { id: 'home', text: 'Return to Projects (breadcrumb)', go: (a) => a.home() },
    ],
  },
  {
    title: 'Share and invite',
    items: [
      { id: 'share', text: 'Open Share and inspect members', go: (a) => a.ws('openShare') },
      { id: 'invite', text: 'Preview creating an invitation', go: (a) => a.ws('openShare') },
    ],
  },
  {
    title: 'Run a cell',
    items: [
      { id: 'add-cell', text: 'Add a Python code cell', go: (a) => a.ws('openByKind', 'notebook') },
      { id: 'run-42', text: 'Run 6 * 7 and see 42', go: (a) => a.ws('demoSixTimesSeven'), goLabel: 'Do it' },
    ],
  },
  {
    title: 'States and access',
    items: [
      { id: 'reconnecting', text: 'Show reconnecting', go: (a) => a.ws('setSync', 'pending') },
      { id: 'runtime-error', text: 'Show a runtime error', go: (a) => a.ws('setRuntime', 'error') },
      { id: 'keyboard', text: 'Use Tab, Enter, Esc and arrow keys' },
      { id: 'mobile', text: 'View at mobile width (≤ 760px)' },
    ],
  },
];
const TOTAL = STEPS.reduce((n, s) => n + s.items.length, 0);

export default function PrototypeDock({ inWorkspace, progress, workspaceApi, onOpenDataStudy, onHome, showEmpty, onToggleEmpty, onResetProgress }) {
  const [open, setOpen] = useState(() => window.innerWidth > 760);
  const [tab, setTab] = useState('walkthrough');
  const [, force] = useState(0);
  const done = STEPS.flatMap((s) => s.items).filter((i) => progress.has(i.id)).length;

  // Runs a workspace action, opening the Data Study fixture first if needed.
  const actions = {
    ws(method, arg) {
      const call = () => {
        workspaceApi.current?.[method]?.(arg);
        force((n) => n + 1);
      };
      if (inWorkspace) call();
      else {
        onOpenDataStudy();
        setTimeout(call, 30);
      }
      if (window.innerWidth <= 760) setOpen(false);
    },
    home: onHome,
  };

  if (!open) {
    return (
      <button type="button" className="dock-pill" onClick={() => setOpen(true)} aria-label={`Open prototype guide, ${done} of ${TOTAL} steps done`}>
        <Icon name="flask" /> Prototype guide <span className="dock-pill__count">{done}/{TOTAL}</span>
      </button>
    );
  }

  const api = workspaceApi.current;
  return (
    <aside className="dock" aria-label="Prototype guide">
      <header className="dock__head">
        <Icon name="flask" />
        <span className="dock__title">Prototype guide</span>
        <span className="dock__count">{done}/{TOTAL}</span>
        <span className="spacer" />
        <IconButton icon="close" label="Hide prototype guide" onClick={() => setOpen(false)} tooltipSide="left" />
      </header>
      <p className="dock__note small">
        Everything here runs on fixture data. People, saves, sync and Python output are simulated; no backend is connected.
      </p>
      <div className="dock__tabs" role="tablist" aria-label="Guide sections">
        {['walkthrough', 'states'].map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t === 'walkthrough' ? 'Walkthrough' : 'Fixture states'}
          </button>
        ))}
      </div>

      {tab === 'walkthrough' ? (
        <div className="dock__body" role="tabpanel" aria-label="Walkthrough">
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <p className="steps__title">{i + 1}. {s.title}</p>
                <ul>
                  {s.items.map((item) => {
                    const ok = progress.has(item.id);
                    return (
                      <li key={item.id} className={ok ? 'is-done' : ''}>
                        <span className="steps__check" aria-hidden="true">{ok && <Icon name="check" size={12} />}</span>
                        <span className="steps__text">
                          {item.text}
                          <span className="sr-only">{ok ? ' (done)' : ' (not done)'}</span>
                        </span>
                        {item.go && (
                          <button type="button" className="btn btn--small btn--ghost" onClick={() => item.go(actions)} aria-label={`${item.goLabel ?? 'Show'}: ${item.text}`}>
                            {item.goLabel ?? 'Show'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn--small btn--ghost" onClick={onResetProgress}>Reset checklist</button>
        </div>
      ) : (
        <div className="dock__body" role="tabpanel" aria-label="Fixture states">
          {inWorkspace ? (
            <>
              <fieldset className="states">
                <legend>Sync status</legend>
                {[
                  ['saved', 'Saved'],
                  ['saving', 'Saving'],
                  ['pending', 'Changes pending'],
                  ['reconnecting', 'Reconnecting'],
                ].map(([k, l]) => (
                  <button key={k} type="button" className="btn btn--small" onClick={() => actions.ws('setSync', k)}>{l}</button>
                ))}
              </fieldset>
              <fieldset className="states" disabled={!api || api.activeKind === 'markdown' || !api.activeKind}>
                <legend>Runtime for {api?.activeName ?? 'active file'}</legend>
                {[
                  ['off', 'Not started'],
                  ['loading', 'Loading'],
                  ['running', 'Running'],
                  ['stopped', 'Stopped'],
                  ['error', 'Error'],
                ].map(([k, l]) => (
                  <button key={k} type="button" className="btn btn--small" onClick={() => actions.ws('setRuntime', k)}>{l}</button>
                ))}
                {api?.activeKind === 'markdown' && <p className="small muted">Open a .py file or notebook to preview runtime states.</p>}
              </fieldset>
              <fieldset className="states">
                <legend>Collaboration</legend>
                <button type="button" className="btn btn--small" onClick={() => actions.ws('togglePresence')}>
                  {api?.showPresence ? 'Hide' : 'Show'} teammate cursors
                </button>
              </fieldset>
            </>
          ) : (
            <fieldset className="states">
              <legend>Project home</legend>
              <button type="button" className="btn btn--small" onClick={onToggleEmpty} aria-pressed={showEmpty}>
                {showEmpty ? 'Show fixture projects' : 'Show empty state'}
              </button>
              <button type="button" className="btn btn--small" onClick={onOpenDataStudy}>Open Data Study</button>
            </fieldset>
          )}
        </div>
      )}
    </aside>
  );
}
