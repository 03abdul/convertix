import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Image as ImageIcon,
  FileText,
  Layers,
  Download,
  Settings,
  Zap,
  Sparkles,
  Wand2,
  Search,
  ShieldCheck,
  FolderDown,
  FileImage,
  Crop,
  FilePlus2,
  FileCog,
  Workflow,
  Keyboard,
} from 'lucide-react';
import ShortcutsDialog from '@/components/ShortcutsDialog';
import { PageSkeleton } from '@/components/ui/Skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useDownloads } from '@/context/DownloadContext';
import { Suspense, useEffect, useRef, useState } from 'react';

const navGroups = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'd' }],
  },
  {
    label: 'Image Tools',
    items: [
      { to: '/converter', label: 'Converter', icon: ImageIcon, shortcut: 'c' },
      { to: '/optimizer', label: 'Optimizer', icon: Zap, shortcut: 'o' },
      { to: '/editor', label: 'Editor', icon: Wand2, shortcut: 'e' },
      { to: '/watermark', label: 'Watermark', icon: ShieldCheck, shortcut: 'w' },
      { to: '/metadata', label: 'Metadata', icon: FileImage, shortcut: 'm' },
      { to: '/quick-tools', label: 'Quick Tools', icon: Crop, shortcut: 'q' },
    ],
  },
  {
    label: 'PDF Tools',
    items: [
      { to: '/pdf-tools', label: 'PDF Tools', icon: FileText, shortcut: 'p' },
      { to: '/image-to-pdf', label: 'Image to PDF', icon: FilePlus2, shortcut: 'i' },
    ],
  },
  {
    label: 'Documents',
    items: [{ to: '/document-converter', label: 'Converter', icon: FileCog, shortcut: 'x' }],
  },
  {
    label: 'Workflow',
    items: [
      { to: '/batch', label: 'Batch Processing', icon: Layers, shortcut: 'b' },
      { to: '/workflow', label: 'Workflow Builder', icon: Workflow, shortcut: 'f' },
      { to: '/downloads', label: 'Downloads', icon: Download, shortcut: 'l' },
      { to: '/settings', label: 'Settings', icon: Settings, shortcut: 's' },
    ],
  },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef(null);
  const { items: downloadItems } = useDownloads();
  const allItems = navGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })));

  // Global shortcuts: Ctrl/Cmd+K or "/" focuses search, "?" opens help, "g" then a letter navigates.
  useEffect(() => {
    let awaitingGoTo = false;
    let timer;
    const focusSearch = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey) return;
      const target = event.target;
      const typing = target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        focusSearch();
        return;
      }
      if (typing || event.ctrlKey || event.metaKey) return;
      if (event.key === '/') {
        event.preventDefault();
        focusSearch();
      } else if (event.key === '?') {
        event.preventDefault();
        setHelpOpen((open) => !open);
      } else if (awaitingGoTo) {
        clearTimeout(timer);
        awaitingGoTo = false;
        const match = allItems.find((item) => item.shortcut === event.key.toLowerCase());
        if (match) {
          event.preventDefault();
          navigate(match.to);
        }
      } else if (event.key.toLowerCase() === 'g') {
        awaitingGoTo = true;
        timer = setTimeout(() => { awaitingGoTo = false; }, 1200);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
    // allItems is derived from a module constant, so it is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const matchingTools = navGroups
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
    .filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950 text-dark-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-secondary-500/8 blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className="z-10 hidden w-64 shrink-0 flex-col border-r border-white/10 bg-dark-900/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-500 to-primary-500 shadow-lg shadow-secondary-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">Convertix</p>
            <p className="text-[10px] font-medium text-dark-400 tracking-wider uppercase">Image Studio</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-dark-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-gradient-to-r from-secondary-500/20 to-primary-500/10 text-secondary-300 border border-secondary-500/20'
                        : 'text-dark-300 hover:bg-white/5 hover:text-dark-100 border border-transparent'
                      }`
                    }
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-xl bg-gradient-to-br from-secondary-500/15 to-primary-500/10 p-3 border border-secondary-500/20">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-secondary-400" />
              <p className="text-xs font-semibold text-dark-100">100% Private</p>
            </div>
            <p className="text-[11px] text-dark-400 leading-relaxed">
              All processing happens in your browser. Files never leave your device.
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative z-50 flex h-16 shrink-0 items-center gap-4 border-b border-white/10 bg-dark-900/80 backdrop-blur-xl px-4 lg:px-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-secondary-500 to-primary-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <p className="font-extrabold">Convertix</p>
          </div>

          <div className="relative ml-auto hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              type="text"
              ref={searchRef}
              placeholder="Search tools..."
              aria-label="Search tools"
              role="combobox"
              aria-expanded={search.trim().length > 0}
              aria-controls="tool-search-results"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearch('');
                if (event.key === 'Enter' && matchingTools.length > 0) {
                  navigate(matchingTools[0].to);
                  setSearch('');
                }
              }}
              className="w-64 rounded-xl border border-white/10 bg-dark-800/60 py-2 pl-9 pr-14 text-sm text-dark-100 placeholder:text-dark-400 focus:border-secondary-500/40 focus:outline-none focus:ring-1 focus:ring-secondary-500/30 transition-all"
            />
            {!search && (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-dark-900 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-dark-400">Ctrl K</kbd>
            )}
            {search.trim() && (
              <div id="tool-search-results" role="listbox" className="absolute right-0 top-full z-[100] mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-dark-900 shadow-xl">
                {matchingTools.length > 0 ? matchingTools.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => {
                      navigate(item.to);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
                  >
                    <item.icon className="h-4 w-4 text-secondary-400" />
                    <span className="text-sm text-dark-100">{item.label}</span>
                    <span className="ml-auto text-xs text-dark-400">{item.group}</span>
                  </button>
                )) : (
                  <p className="px-4 py-3 text-sm text-dark-400">No matching tools</p>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto md:ml-0 flex items-center gap-2">
            <button
              type="button"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              onClick={() => setHelpOpen(true)}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-dark-800/60 text-dark-300 transition-colors hover:bg-white/5 hover:text-dark-100 sm:flex"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <Link
              to="/downloads"
              aria-label={`Downloads, ${downloadItems.length} file${downloadItems.length === 1 ? '' : 's'}`}
              title="Processed files from this session"
              className="relative flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-dark-800/60 px-3 text-sm font-medium text-dark-200 transition-colors hover:bg-white/5 hover:text-dark-100"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Downloads</span>
              {downloadItems.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-500 px-1.5 text-[11px] font-bold text-dark-950">
                  {downloadItems.length}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-thin border-b border-white/10 bg-dark-900/60 px-3 py-2">
          {navGroups.flatMap((g) => g.items).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all ${isActive
                  ? 'bg-secondary-500/20 text-secondary-300'
                  : 'text-dark-300 hover:bg-white/5'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div key={location.pathname} className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Only the page area shows a loader while a route's code loads; the sidebar and header stay put. */}
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} navItems={allItems} />
    </div>
  );
}
