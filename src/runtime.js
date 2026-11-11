import { CANNED_OUTPUTS, UNSUPPORTED_PACKAGES } from './fixtures.js';

// SIMULATED runtime for the Phase 1 prototype. No Python is executed.
// Milestone 4 replaces this with a browser runtime (e.g. Pyodide) in an isolated worker.

export const LOAD_MS = 1100;
export const RUN_MS = 700;

const ARITHMETIC = /^[\d\s+\-*/%().]+$/;

export function simulate(source) {
  const code = source.trim();
  if (!code) return { ok: true, text: '' };

  const imported = [...code.matchAll(/^\s*(?:import|from)\s+([A-Za-z_]\w*)/gm)].map((m) => m[1]);
  const missing = imported.find((p) => UNSUPPORTED_PACKAGES.includes(p));
  if (missing) return unsupported(missing);

  if (CANNED_OUTPUTS[code] !== undefined) return { ok: true, text: CANNED_OUTPUTS[code] };

  if (ARITHMETIC.test(code)) {
    try {
      // Safe: the regex above admits only digits, whitespace, and arithmetic operators.
      const value = Function(`"use strict"; return (${code.replace(/\*\*/g, '**')});`)();
      return { ok: true, text: String(Number.isInteger(value) ? value : Number(value.toPrecision(12))) };
    } catch {
      return { ok: false, error: { name: 'SyntaxError', message: 'invalid syntax', hint: null } };
    }
  }

  const prints = [...code.matchAll(/print\(\s*["']([^"']*)["']\s*\)/g)].map((m) => m[1]);
  if (prints.length) return { ok: true, text: prints.join('\n') };

  return { ok: true, text: '', note: 'The preview runtime has no sample output for this code.' };
}

export function unsupported(pkg = 'torch') {
  return {
    ok: false,
    error: {
      name: 'ModuleNotFoundError',
      message: `No module named '${pkg}'`,
      unsupported: pkg,
    },
  };
}

export const RUNTIME_LABELS = {
  off: 'Not started',
  loading: 'Loading Python…',
  idle: 'Ready',
  running: 'Running…',
  stopped: 'Stopped',
  error: 'Error',
};
