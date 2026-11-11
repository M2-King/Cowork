// Client-side file helpers. Download and .ipynb import/export work locally on the
// in-memory fixture content; nothing is uploaded.

export function toIpynb(file) {
  const lines = (s) => s.split('\n').map((l, i, a) => (i < a.length - 1 ? `${l}\n` : l));
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: 'python3', display_name: 'Python 3', language: 'python' },
      language_info: { name: 'python' },
    },
    cells: file.cells.map((c) =>
      c.type === 'markdown'
        ? { cell_type: 'markdown', id: c.id, metadata: {}, source: lines(c.source) }
        : {
            cell_type: 'code',
            id: c.id,
            metadata: {},
            execution_count: c.count ?? null,
            source: lines(c.source),
            outputs:
              c.output?.kind === 'text' && c.output.text
                ? [{ output_type: 'execute_result', execution_count: c.count ?? null, metadata: {}, data: { 'text/plain': lines(c.output.text) } }]
                : c.output?.kind === 'error'
                  ? [{ output_type: 'error', ename: c.output.error.name, evalue: c.output.error.message, traceback: [] }]
                  : [],
          },
    ),
  };
}

export function parseIpynb(text, makeId) {
  const nb = JSON.parse(text);
  if (!Array.isArray(nb.cells)) throw new Error('This file has no notebook cells.');
  const join = (s) => (Array.isArray(s) ? s.join('') : String(s ?? ''));
  return nb.cells
    .filter((c) => c.cell_type === 'code' || c.cell_type === 'markdown')
    .map((c) => {
      const cell = { id: makeId(), type: c.cell_type, source: join(c.source) };
      if (c.cell_type === 'code') {
        cell.count = c.execution_count ?? null;
        const out = (c.outputs ?? []).find((o) => o.data?.['text/plain'] || o.text);
        if (out) cell.output = { kind: 'text', text: join(out.data?.['text/plain'] ?? out.text) };
      }
      return cell;
    });
}

export function downloadFile(file) {
  const isNb = file.kind === 'notebook';
  const body = isNb ? JSON.stringify(toIpynb(file), null, 1) : file.text;
  const blob = new Blob([body], { type: isNb ? 'application/x-ipynb+json' : 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
