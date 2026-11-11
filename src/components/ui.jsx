import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/** Icon-only button with an accessible name and a hover/focus tooltip. */
export function IconButton({ icon, label, onClick, className = '', tooltipSide = 'bottom', ...rest }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-side={tooltipSide}
      onClick={onClick}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

export function Avatar({ person, size = 'md', ring = false, label }) {
  return (
    <span
      className={`avatar avatar--${size} ${ring ? 'avatar--ring' : ''}`}
      style={{ '--person': person.color }}
      role="img"
      aria-label={label ?? person.name}
      title={label ?? person.name}
    >
      {person.initials}
    </span>
  );
}

export function PreviewTag({ children = 'Preview data' }) {
  return <span className="preview-tag">{children}</span>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal dialog with focus trap, Escape to close, and focus return. */
export function Dialog({ title, onClose, children, footer, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const first = node.querySelector('[data-autofocus]') || node.querySelector(FOCUSABLE);
    first?.focus();
    return () => previous?.focus?.();
  }, []);

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.key === 'Tab') {
      const items = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
      >
        <header className="dialog__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </header>
        <div className="dialog__body">{children}</div>
        {footer && <footer className="dialog__footer">{footer}</footer>}
      </div>
    </div>
  );
}

/**
 * Menu button with an accessible popup menu (arrow keys, Home/End, Escape).
 * items: [{ label, icon, onSelect, danger }]
 */
export function MenuButton({ label, icon = 'more', text, items, className = '', align = 'end', buttonClassName = '' }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    function onDoc(e) {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function close(focusButton = true) {
    setOpen(false);
    if (focusButton) btnRef.current?.focus();
  }

  function onMenuKey(e) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
  }

  return (
    <span className={`menu-wrap ${className}`}>
      <button
        ref={btnRef}
        type="button"
        className={text ? `btn btn--ghost ${buttonClassName}` : `icon-btn ${buttonClassName}`}
        aria-label={text ? undefined : label}
        data-tooltip={open || text ? undefined : label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
        }}
      >
        {text ? (
          <>
            <span className="truncate">{text}</span>
            <Icon name="chevronDown" />
          </>
        ) : (
          <Icon name={icon} />
        )}
      </button>
      {open && (
        <div ref={menuRef} id={menuId} role="menu" aria-label={label} className={`menu menu--${align}`} onKeyDown={onMenuKey}>
          {items.map((item) => (
            <button
              key={item.key ?? item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`menu__item ${item.danger ? 'menu__item--danger' : ''}`}
              onClick={(e) => { e.stopPropagation(); close(); item.onSelect(); }}
            >
              {item.icon && <Icon name={item.icon} />}
              <span>{item.label}</span>
              {item.hint && <span className="menu__hint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/** Polite live region for announcing status changes to screen readers. */
export function LiveRegion({ message }) {
  return (
    <div className="sr-only" aria-live="polite" role="status">
      {message}
    </div>
  );
}
