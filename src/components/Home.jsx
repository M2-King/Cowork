import { useState } from 'react';
import { ME, PEOPLE } from '../fixtures.js';
import Icon from './Icon.jsx';
import { Avatar, Dialog, IconButton, PreviewTag } from './ui.jsx';

export default function Home({ projects, onOpen, onCreate, theme, onToggleTheme }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="home">
      <header className="home__bar">
        <span className="brand">
          <span className="brand__mark" aria-hidden="true">C</span>
          Cowork
        </span>
        <span className="proto-badge" title="Clickable prototype with fixture data">Prototype</span>
        <span className="spacer" />
        <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'} onClick={onToggleTheme} />
        <Avatar person={ME} label={`Signed in as ${ME.name} (preview)`} />
      </header>

      <main id="main" className="home__main" tabIndex={-1}>
        <div className="home__head">
          <div>
            <h1>Projects</h1>
            <p className="muted">Private projects you own or were invited to.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New project
          </button>
        </div>

        <p className="fixture-note">
          <PreviewTag>Fixture data</PreviewTag> Projects, people and activity on this page are sample data. Nothing is saved.
        </p>

        {projects.length === 0 ? (
          <section className="empty" aria-labelledby="empty-title">
            <div className="empty__icon" aria-hidden="true"><Icon name="folder" size={28} /></div>
            <h2 id="empty-title">No projects yet</h2>
            <p className="muted">Create a private project, add Python files or notebooks, and invite your team.</p>
            <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
              <Icon name="plus" /> New project
            </button>
          </section>
        ) : (
          <ul className="project-list" aria-label="Your projects">
            {projects.map((p) => {
              const role = p.ownerId === ME.id ? 'Owner' : 'Member';
              return (
                <li key={p.id}>
                  <button type="button" className="project-card" onClick={() => onOpen(p.id)}>
                    <span className="project-card__top">
                      <span className="project-card__name">{p.name}</span>
                      <span className={`role role--${role.toLowerCase()}`}>{role}</span>
                    </span>
                    <span className="project-card__meta">
                      <span className="avatar-stack" aria-hidden="true">
                        {p.members.slice(0, 4).map((m) => (
                          <Avatar key={m.userId} person={PEOPLE[m.userId]} size="sm" />
                        ))}
                      </span>
                      <span>{p.members.length} {p.members.length === 1 ? 'member' : 'members'}</span>
                    </span>
                    <span className="project-card__activity muted">{p.lastActivity}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {creating && <NewProjectDialog onClose={() => setCreating(false)} onCreate={onCreate} />}
    </div>
  );
}

function NewProjectDialog({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const valid = name.trim().length > 0;
  return (
    <Dialog
      title="New project"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="new-project" className="btn btn--primary" disabled={!valid}>Create project</button>
        </>
      }
    >
      <form
        id="new-project"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onCreate(name.trim());
        }}
      >
        <label className="field">
          <span>Project name</span>
          <input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Field Survey" maxLength={60} />
        </label>
        <p className="muted small">Projects are private. You'll be the owner and can invite teammates from <strong>Share</strong>.</p>
        <p className="small"><PreviewTag>Preview</PreviewTag> The project exists only in this browser tab.</p>
      </form>
    </Dialog>
  );
}
