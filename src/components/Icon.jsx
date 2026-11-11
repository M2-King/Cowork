// Small inline icon set (stroke icons, 16px). Decorative: callers provide accessible names.
const PATHS = {
  menu: 'M3 5h14M3 10h14M3 15h14',
  home: 'M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z',
  plus: 'M10 4v12M4 10h12',
  file: 'M5 3h7l4 4v10H5zM12 3v4h4',
  notebook: 'M5 3h10v14H5zM8 3v14M10 7h3M10 10h3',
  import: 'M10 3v9M6 8l4 4 4-4M4 15h12',
  download: 'M10 3v10M6 9l4 4 4-4M4 17h12',
  share: 'M13 6a2 2 0 1 0 0-.01M5 10a2 2 0 1 0 0-.01M13 14a2 2 0 1 0 0-.01M6.8 9l4.4-2.2M6.8 11l4.4 2.2',
  play: 'M6 4l10 6-10 6z',
  stop: 'M5 5h10v10H5z',
  restart: 'M4 10a6 6 0 1 0 2-4.5M4 3v3.5h3.5',
  more: 'M5 10h.01M10 10h.01M15 10h.01',
  close: 'M5 5l10 10M15 5 5 15',
  chevronDown: 'M5 8l5 5 5-5',
  chevronRight: 'M8 5l5 5-5 5',
  sun: 'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  moon: 'M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z',
  edit: 'M4 16h3L16 7l-3-3-9 9zM12 5l3 3',
  check: 'M4 10.5 8 14l8-8',
  alert: 'M10 3 2 17h16zM10 8v4M10 14.5h.01',
  sync: 'M4 10a6 6 0 0 1 10.5-4M16 10a6 6 0 0 1-10.5 4M14 2.5v3.5h-3.5M6 17.5V14h3.5',
  cloudOff: 'M3 3l14 14M8 6.2A5 5 0 0 1 15 9a3 3 0 0 1 1.6 5.4M13 15H6a3.5 3.5 0 0 1-1.2-6.8',
  folder: 'M3 5h5l2 2h7v9H3z',
  flask: 'M8 3h4M9 3v5l-5 8h12l-5-8V3',
  user: 'M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 17a6 6 0 0 1 12 0',
  mail: 'M3 5h14v10H3zM3 5l7 6 7-6',
  cpu: 'M6 6h8v8H6zM8 3v3M12 3v3M8 14v3M12 14v3M3 8h3M3 12h3M14 8h3M14 12h3',
  trash: 'M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11',
  markdown: 'M3 5h14v10H3zM6 12V8l2 2 2-2v4M13 8v4M11.5 10.5 13 12l1.5-1.5',
};

export default function Icon({ name, size = 16, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name] || PATHS.file} />
    </svg>
  );
}

export function FileIcon({ kind }) {
  const name = kind === 'notebook' ? 'notebook' : kind === 'markdown' ? 'markdown' : 'file';
  return <Icon name={name} className={`file-icon file-icon--${kind}`} />;
}
