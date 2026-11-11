import { useState } from 'react';
import { ME, PEOPLE } from '../fixtures.js';
import Icon from './Icon.jsx';
import { Avatar, Dialog, MenuButton, PreviewTag } from './ui.jsx';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareDialog({ project, onClose, onInvite, onRevoke }) {
  const isOwner = project.ownerId === ME.id;
  const owner = PEOPLE[project.ownerId];
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  function submit(e) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!EMAIL.test(v)) return setError('Enter a valid email address.');
    if (project.invitations.some((i) => i.email === v)) return setError('That person already has a pending invitation.');
    onInvite(v);
    setSentTo(v);
    setEmail('');
  }

  return (
    <Dialog title={`Share ${project.name}`} onClose={onClose} className="share">
      <p className="muted small share__intro">
        This project is private. The owner manages invitations and access; members can edit every file.
      </p>

      {isOwner ? (
        <form className="invite" onSubmit={submit} noValidate>
          <label className="field">
            <span>Invite by email</span>
            <div className="invite__row">
              <input
                data-autofocus
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="name@example.com"
                value={email}
                aria-invalid={Boolean(error)}
                aria-describedby="invite-help"
                onChange={(e) => { setEmail(e.target.value); setError(''); setSentTo(''); }}
              />
              <button type="submit" className="btn btn--primary">Invite as member</button>
            </div>
          </label>
          <p id="invite-help" className={`small ${error ? 'field-error' : 'muted'}`} role={error ? 'alert' : undefined}>
            {error || 'Invitations are for members. Projects are designed for teams of about five.'}
          </p>
          {sentTo && (
            <p className="notice small" role="status">
              <Icon name="check" /> Invitation for {sentTo} added below. <PreviewTag>Preview: no email sent</PreviewTag>
            </p>
          )}
        </form>
      ) : (
        <p className="notice small">
          <Icon name="user" /> Only the owner, {owner.name}, can invite people or change access.
        </p>
      )}

      <section aria-labelledby="members-h">
        <h3 id="members-h" className="share__h">
          Members <span className="count">{project.members.length}</span>
          <PreviewTag />
        </h3>
        <ul className="people">
          {project.members.map((m) => {
            const p = PEOPLE[m.userId];
            const online = project.online.includes(m.userId) || m.userId === ME.id;
            return (
              <li key={m.userId} className="person">
                <Avatar person={p} size="md" />
                <span className="person__text">
                  <span className="person__name">
                    {p.name} {m.userId === ME.id && <span className="muted">(you)</span>}
                  </span>
                  <span className="muted small">{online ? 'Online now' : 'Offline'}</span>
                </span>
                <span className={`role role--${m.role}`}>{m.role === 'owner' ? 'Owner' : 'Member'}</span>
                {isOwner && m.role !== 'owner' ? (
                  <MenuButton
                    label={`Manage ${p.name}`}
                    items={[{ label: 'Remove from project (preview)', icon: 'trash', danger: true, onSelect: () => {} }]}
                  />
                ) : (
                  <span className="person__menu-spacer" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="pending-h">
        <h3 id="pending-h" className="share__h">
          Pending invitations <span className="count">{project.invitations.length}</span>
        </h3>
        {project.invitations.length === 0 ? (
          <p className="muted small">No pending invitations.</p>
        ) : (
          <ul className="people">
            {project.invitations.map((inv) => (
              <li key={inv.id} className="person">
                <span className="avatar avatar--md avatar--pending" aria-hidden="true"><Icon name="mail" /></span>
                <span className="person__text">
                  <span className="person__name truncate">{inv.email}</span>
                  <span className="muted small">{inv.sent}</span>
                </span>
                <span className="role role--pending">Invited</span>
                {isOwner ? (
                  <MenuButton
                    label={`Manage invitation for ${inv.email}`}
                    items={[{ label: 'Revoke invitation', icon: 'trash', danger: true, onSelect: () => onRevoke(inv.id) }]}
                  />
                ) : (
                  <span className="person__menu-spacer" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  );
}
