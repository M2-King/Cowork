import { ME, PEOPLE, REMOTE_PRESENCE } from '../fixtures.js';
import Icon from './Icon.jsx';
import { Avatar, IconButton, MenuButton } from './ui.jsx';

function syncView(sync) {
  if (sync.connection === 'reconnecting') {
    return sync.pending > 0
      ? { tone: 'warn', icon: 'cloudOff', text: `${sync.pending} pending`, label: `Reconnecting. ${sync.pending} changes pending on this device.` }
      : { tone: 'warn', icon: 'cloudOff', text: 'Reconnecting…', label: 'Reconnecting to the project.' };
  }
  if (sync.saving) return { tone: 'busy', icon: 'sync', text: 'Saving…', label: 'Saving changes.' };
  return { tone: 'ok', icon: 'check', text: 'Saved', label: 'All changes saved.' };
}

export default function TopBar({ project, projects, onOpenProject, onHome, sync, onReconnect, onShare, onToggleDrawer, drawerOpen, theme, onToggleTheme, files }) {
  const s = syncView(sync);
  const online = project.online.map((id) => PEOPLE[id]);
  const whereIs = (id) => {
    const entry = Object.entries(REMOTE_PRESENCE).find(([, p]) => p.userId === id);
    const f = entry && files.find((x) => x.id === entry[0]);
    return f ? `editing ${f.name}` : 'viewing the project';
  };

  return (
    <header className="topbar">
      <IconButton
        icon="menu"
        label={drawerOpen ? 'Hide files' : 'Show files'}
        className="topbar__drawer-btn"
        aria-expanded={drawerOpen}
        aria-controls="file-sidebar"
        onClick={onToggleDrawer}
      />
      <nav className="crumbs" aria-label="Breadcrumb">
        <button type="button" className="crumbs__home" onClick={onHome} aria-label="All projects" data-tooltip="All projects">
          <span className="brand__mark" aria-hidden="true">C</span>
          <span className="crumbs__home-text">Projects</span>
        </button>
        <span className="crumbs__sep" aria-hidden="true">/</span>
        <MenuButton
          label={`Switch project. Current project: ${project.name}`}
          text={project.name}
          align="start"
          buttonClassName="crumbs__project"
          items={[
            ...projects.map((p) => ({
              key: p.id,
              label: p.name,
              icon: p.id === project.id ? 'check' : 'folder',
              hint: p.lastActivityShort,
              onSelect: () => p.id !== project.id && onOpenProject(p.id),
            })),
            { key: 'home', label: 'All projects', icon: 'home', onSelect: onHome },
          ]}
        />
        <span className="proto-badge">Prototype</span>
      </nav>

      <span className="spacer" />

      <div className="participants" role="group" aria-label={`${online.length + 1} people here (preview)`}>
        <Avatar person={ME} size="sm" label={`${ME.name} (you)`} />
        {online.map((p, i) => (
          <span key={p.id} className={i > 0 ? 'participants__extra' : ''}>
            <Avatar person={p} size="sm" ring label={`${p.name}, ${whereIs(p.id)} (preview)`} />
          </span>
        ))}
        {online.length > 1 && (
          <span className="participants__more" aria-hidden="true">+{online.length - 1}</span>
        )}
      </div>

      {sync.connection === 'reconnecting' ? (
        <button type="button" className={`sync sync--${s.tone}`} onClick={onReconnect} aria-label={`${s.label} Retry now.`} data-tooltip="Retry now">
          <Icon name={s.icon} />
          <span className="sync__text">{s.text}</span>
        </button>
      ) : (
        <span className={`sync sync--${s.tone}`} role="status" aria-label={s.label} title={s.label}>
          <Icon name={s.icon} className={s.tone === 'busy' ? 'spin' : ''} />
          <span className="sync__text">{s.text}</span>
        </span>
      )}

      <button type="button" className="btn btn--primary btn--share" onClick={onShare} aria-label="Share project">
        <Icon name="share" />
        <span className="btn__text">Share</span>
      </button>
      <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={onToggleTheme} className="topbar__theme" />
    </header>
  );
}
