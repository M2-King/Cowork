import { useCallback, useEffect, useRef, useState } from 'react';
import { makeProjects } from './fixtures.js';
import Home from './components/Home.jsx';
import Workspace from './components/Workspace.jsx';
import PrototypeDock from './components/PrototypeDock.jsx';

function initialTheme() {
  try {
    const saved = localStorage.getItem('cowork-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [projects, setProjects] = useState(makeProjects);
  const [showEmpty, setShowEmpty] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [theme, setTheme] = useState(initialTheme);
  const [progress, setProgress] = useState(() => new Set());
  const workspaceApi = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('cowork-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const mark = useCallback((step) => {
    setProgress((prev) => (prev.has(step) ? prev : new Set(prev).add(step)));
  }, []);

  // Walkthrough step 4: keyboard use and narrow width.
  useEffect(() => {
    const onKey = (e) => e.key === 'Tab' && mark('keyboard');
    const onResize = () => window.innerWidth <= 760 && mark('mobile');
    onResize();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [mark]);

  const project = projects.find((p) => p.id === projectId);

  function openProject(id) {
    setProjectId(id);
    window.scrollTo(0, 0);
  }

  function goHome() {
    setProjectId(null);
    if (project) mark('home');
  }

  function updateProject(id, fn) {
    setProjects((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  }

  function createProject(name) {
    const id = `p-${Date.now()}`;
    const p = {
      id,
      name,
      ownerId: 'u-alex',
      lastActivity: 'Created just now by you',
      lastActivityShort: 'Just now',
      members: [{ userId: 'u-alex', role: 'owner' }],
      invitations: [],
      online: [],
      files: [{ id: `${id}-readme`, name: 'README.md', kind: 'markdown', text: `# ${name}\n\nNew fixture project. Nothing here is saved.\n` }],
    };
    setProjects((ps) => [p, ...ps]);
    setShowEmpty(false);
    openProject(id);
  }

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      {project ? (
        <Workspace
          key={project.id}
          project={project}
          projects={projects}
          onOpenProject={openProject}
          onHome={goHome}
          onUpdate={(fn) => updateProject(project.id, fn)}
          theme={theme}
          onToggleTheme={toggleTheme}
          mark={mark}
          apiRef={workspaceApi}
        />
      ) : (
        <Home
          projects={showEmpty ? [] : projects}
          onOpen={openProject}
          onCreate={createProject}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      <PrototypeDock
        inWorkspace={Boolean(project)}
        projectName={project?.name}
        progress={progress}
        workspaceApi={workspaceApi}
        onOpenDataStudy={() => openProject('p-data-study')}
        onHome={goHome}
        showEmpty={showEmpty}
        onToggleEmpty={() => setShowEmpty((v) => !v)}
        onResetProgress={() => setProgress(new Set())}
      />
    </>
  );
}
