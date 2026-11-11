import { useMemo } from 'react';

const PY_KEYWORDS = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print'.split(' '),
);

// Minimal Python tokenizer for preview highlighting only.
const PY_TOKEN = /("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:[^"\\]|\\.)*"|f?'(?:[^'\\]|\\.)*'|#.*$|\b\d[\d_.]*\b|\b[A-Za-z_]\w*\b)/gm;

function highlightPython(line) {
  const out = [];
  let last = 0;
  let prevWord = '';
  for (const m of line.matchAll(PY_TOKEN)) {
    const tok = m[0];
    if (m.index > last) out.push(line.slice(last, m.index));
    let cls = null;
    if (tok.startsWith('#')) cls = 'tok-comment';
    else if (/^f?["']/.test(tok)) cls = 'tok-string';
    else if (/^\d/.test(tok)) cls = 'tok-number';
    else if (PY_KEYWORDS.has(tok)) cls = 'tok-keyword';
    else if (prevWord === 'def' || prevWord === 'class') cls = 'tok-def';
    out.push(cls ? <span key={m.index} className={cls}>{tok}</span> : tok);
    if (/^[A-Za-z_]/.test(tok)) prevWord = tok;
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function highlightMarkdown(line) {
  if (/^#{1,6}\s/.test(line)) return [<span key="h" className="tok-heading">{line}</span>];
  return line.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? <span key={i} className="tok-string">{part}</span> : part,
  );
}

/**
 * Lightweight editable code surface: a transparent textarea over a highlighted <pre>.
 * Both layers share font metrics, so teammate cursors can be positioned with `ch` units.
 * In later milestones this is the seam where CodeMirror + Yjs awareness plug in.
 */
export default function CodeEditor({
  value,
  onChange,
  language = 'python',
  label,
  presence,
  lineNumbers = true,
  autoHeight = false,
  onKeyDown,
  id,
}) {
  const lines = value.split('\n');
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const highlighted = useMemo(
    () => lines.map((l) => (language === 'python' ? highlightPython(l) : highlightMarkdown(l))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, language],
  );

  let sel = null;
  if (presence) {
    const text = lines[presence.line] ?? '';
    const from = Math.max(0, text.indexOf(presence.match));
    sel = { line: presence.line, from, to: from + presence.match.length, person: presence.person };
  }

  return (
    <div className={`code ${autoHeight ? 'code--auto' : ''}`} style={{ '--lines': lines.length, '--cols': longest + 2 }}>
      <div className="code__scroller">
        {lineNumbers && (
          <div className="code__gutter" aria-hidden="true">
            {lines.map((_, i) => (
              <div key={i} className={sel && sel.line === i ? 'is-remote' : ''} style={sel && sel.line === i ? { '--person': sel.person.color } : undefined}>
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <div className="code__surface">
          <pre className="code__highlight" aria-hidden="true">
            {highlighted.map((parts, i) => (
              <div key={i} className="code__line">{parts.length ? parts : ' '}</div>
            ))}
          </pre>
          {sel && (
            <div className="remote" style={{ '--person': sel.person.color, '--line': sel.line, '--from': sel.from, '--to': sel.to }} aria-hidden="true">
              <span className="remote__selection" />
              <span className="remote__caret" />
              <span className={`remote__flag ${sel.line === 0 ? 'remote__flag--below' : ''}`}>{sel.person.name.split(' ')[0]}</span>
            </div>
          )}
          <textarea
            id={id}
            className="code__input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={label}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
          />
        </div>
      </div>
      {sel && (
        <p className="sr-only">
          Preview: {sel.person.name} is selecting text on line {sel.line + 1}.
        </p>
      )}
    </div>
  );
}
