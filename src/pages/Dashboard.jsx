import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Download,
  Zap,
  Wand2,
  ShieldCheck,
  FileText,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Clock,
  Cpu,
  Lock,
  FolderDown,
  FileImage,
} from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { useApp } from '@/context/AppContext';
import { formatBytes } from '@/utils/format';
import { useDownloads } from '@/context/DownloadContext';

const quickActions = [
  { to: '/converter', label: 'Convert Image', desc: 'Change formats instantly', icon: ImageIcon, gradient: 'from-secondary-500/20 to-teal-500/10', iconColor: 'text-secondary-400' },
  { to: '/optimizer', label: 'Compress', desc: 'Reduce file size', icon: Zap, gradient: 'from-primary-500/20 to-blue-500/10', iconColor: 'text-primary-400' },
  { to: '/pdf-tools', label: 'Merge PDFs', desc: 'Combine multiple PDFs', icon: FileText, gradient: 'from-accent-500/20 to-orange-500/10', iconColor: 'text-accent-400' },
  { to: '/watermark', label: 'Watermark', desc: 'Protect your images', icon: ShieldCheck, gradient: 'from-error-500/20 to-rose-500/10', iconColor: 'text-error-400' },
  { to: '/optimizer', label: 'Resize', desc: 'Adjust dimensions', icon: Layers, gradient: 'from-secondary-500/20 to-cyan-500/10', iconColor: 'text-secondary-300' },
  { to: '/editor', label: 'Crop & edit', desc: 'Crop, rotate, apply filters', icon: Wand2, gradient: 'from-accent-500/20 to-orange-500/10', iconColor: 'text-accent-400' },
  { to: '/metadata', label: 'Image metadata', desc: 'Inspect EXIF or remove metadata', icon: FileImage, gradient: 'from-primary-500/20 to-indigo-500/10', iconColor: 'text-primary-400' },
  { to: '/quick-tools', label: 'Quick tools', desc: 'One-click image actions', icon: Zap, gradient: 'from-warning-500/20 to-amber-500/10', iconColor: 'text-warning-400' },
  { to: '/workflow', label: 'Workflow', desc: 'Build a pipeline', icon: Sparkles, gradient: 'from-primary-500/20 to-indigo-500/10', iconColor: 'text-primary-300' },
];

const toolCategories = [
  {
    title: 'Image Converter',
    desc: 'JPG, PNG, WebP, BMP, and more',
    to: '/converter',
    icon: ImageIcon,
    items: ['JPG → PNG', 'PNG → WebP', 'WebP → JPG', 'BMP → PNG'],
  },
  {
    title: 'PDF Tools',
    desc: 'Merge, split, compress, rotate',
    to: '/pdf-tools',
    icon: FileText,
    items: ['Merge PDFs', 'Split PDF', 'Compress PDF', 'Rotate PDF'],
  },
  {
    title: 'Image Editor',
    desc: 'Crop, rotate, filters, adjustments',
    to: '/editor',
    icon: Wand2,
    items: ['Crop & Rotate', 'Brightness', 'Contrast', 'Filters'],
  },
  {
    title: 'Document Converter',
    desc: 'TXT, DOCX, PDF conversions',
    to: '/document-converter',
    icon: Layers,
    items: ['TXT → PDF', 'DOCX → PDF', 'PDF → Image'],
  },
  {
    title: 'Batch Processing',
    desc: 'Process many files at once',
    to: '/batch',
    icon: FolderDown,
    items: ['20+ images', 'Single operation', 'ZIP download'],
  },
  {
    title: 'Workflow Builder',
    desc: 'Build a visual pipeline',
    to: '/workflow',
    icon: Sparkles,
    items: ['Resize → Compress', '→ Watermark → Convert'],
  },
];

const stats = [
  { label: 'Processing', value: 'In-Browser', icon: Cpu, color: 'text-secondary-400' },
  { label: 'Privacy', value: '100% Local', icon: Lock, color: 'text-success-400' },
  { label: 'Cost', value: 'Free', icon: Zap, color: 'text-accent-400' },
];

export default function Dashboard() {
  const { recentFiles } = useApp();
  const { items } = useDownloads();

  return (
    <PageTransition>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-dark-800/80 to-dark-900/60 p-6 md:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary-500/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-500/10 border border-secondary-500/20 px-3 py-1.5 mb-4">
              <Sparkles className="h-3.5 w-3.5 text-secondary-400" />
              <span className="text-xs font-medium text-secondary-300">Private image processing suite</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-balance mb-2">
              Your image processing suite
              <br />
              <span className="bg-gradient-to-r from-secondary-400 to-primary-400 bg-clip-text text-transparent">
                right in your browser
              </span>
            </h1>
            <p className="text-dark-300 max-w-xl mb-6">
              Convert, resize, compress, crop, retouch, watermark, and process batches locally in your browser.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/converter"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-400 px-5 py-3 text-sm font-semibold text-dark-950 shadow-lg shadow-secondary-500/25 hover:from-secondary-400 hover:to-secondary-300 transition-all active:scale-95"
              >
                Start Converting
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/workflow"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-dark-100 hover:bg-white/10 transition-all active:scale-95"
              >
                <Sparkles className="h-4 w-4 text-secondary-400" />
                Build a Workflow
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2.5">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <div>
                    <p className="text-xs text-dark-400">{stat.label}</p>
                    <p className="text-sm font-bold text-dark-100">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
            </div>
            <div aria-hidden="true" className="relative mx-auto w-full max-w-sm py-4 sm:py-6">
              <motion.div
                initial={{ opacity: 0, y: 16, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="relative rounded-3xl border border-white/10 bg-dark-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur-md"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-secondary-400/20 bg-secondary-400/10">
                      <ImageIcon className="h-4 w-4 text-secondary-300" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-dark-100">Image ready</p>
                      <p className="text-[11px] text-dark-400">Your files stay on your device</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-success-400/20 bg-success-400/10 px-2 py-1 text-[10px] font-medium text-success-300">LOCAL</span>
                </div>

                <div className="relative h-44 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/30 via-secondary-500/20 to-dark-800">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_24%,rgba(253,230,138,0.9)_0,rgba(253,230,138,0.25)_9%,transparent_25%)]" />
                  <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-teal-950/90 via-teal-800/45 to-transparent" />
                  <div className="absolute bottom-0 left-0 h-3/5 w-[70%] bg-teal-950/70 [clip-path:polygon(0_100%,0_58%,28%_22%,48%_59%,67%_8%,100%_100%)]" />
                  <div className="absolute bottom-0 right-0 h-2/5 w-[65%] bg-secondary-300/35 [clip-path:polygon(0_100%,30%_18%,52%_58%,75%_5%,100%_45%,100%_100%)]" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/15 bg-dark-950/45 px-2.5 py-1.5 backdrop-blur-sm">
                    <ImageIcon className="h-3 w-3 text-white/80" />
                    <span className="text-[10px] font-medium text-white/90">summer-photo.png</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-400/15 text-[9px] font-bold text-primary-300">PNG</span>
                    <span className="text-xs text-dark-300">Original</span>
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-secondary-400/50" />
                    <ArrowRight className="mx-1.5 h-4 w-4 text-secondary-300" />
                    <div className="h-px flex-1 bg-gradient-to-r from-secondary-400/50 to-white/10" />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-secondary-400/20 bg-secondary-400/10 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary-400/20 text-[9px] font-bold text-secondary-200">WEBP</span>
                    <span className="text-xs text-dark-200">Optimized</span>
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-5 top-20 flex items-center gap-2 rounded-xl border border-white/10 bg-dark-800/95 px-3 py-2 shadow-xl shadow-black/30"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-400/10">
                  <ShieldCheck className="h-4 w-4 text-success-300" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-dark-100">Private by design</p>
                  <p className="text-[9px] text-dark-400">No uploads</p>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                className="absolute -right-3 bottom-0 flex items-center gap-2 rounded-xl border border-secondary-400/20 bg-dark-800/95 px-3 py-2 shadow-xl shadow-black/30"
              >
                <Zap className="h-4 w-4 text-accent-300" />
                <span className="text-xs font-semibold text-dark-100">Ready in seconds</span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${action.gradient} p-4 hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5`}
            >
              <action.icon className={`h-7 w-7 ${action.iconColor} mb-3 transition-transform group-hover:scale-110`} />
              <p className="text-sm font-semibold text-dark-100">{action.label}</p>
              <p className="text-xs text-dark-400 mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Tools */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold mb-4">Recent Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {toolCategories.map((tool) => (
            <Link
              key={tool.title}
              to={tool.to}
              className="group rounded-2xl border border-white/10 bg-dark-800/60 p-5 hover:border-secondary-500/30 hover:bg-dark-800/80 transition-all duration-200"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                  <tool.icon className="h-5 w-5 text-secondary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark-100 group-hover:text-secondary-300 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-dark-400 mt-0.5">{tool.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-dark-500 group-hover:text-secondary-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tool.items.map((item) => (
                  <span key={item} className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-dark-300">
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Files */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-dark-400" />
            Recent Files
          </h2>
          <Link to="/downloads" className="text-sm text-secondary-400 hover:text-secondary-300 font-medium">
            View all →
          </Link>
        </div>
        {recentFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentFiles.slice(0, 8).map((file, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-dark-800/60 p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                    <FileText className="h-4 w-4 text-primary-400" />
                  </div>
                  <p className="text-sm font-medium text-dark-100 truncate">{file.name}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-400">
                  <span>{file.source}</span>
                  {file.size > 0 && <span>{formatBytes(file.size)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-dark-800/40 p-10 text-center">
            <FolderDown className="h-10 w-10 text-dark-500 mx-auto mb-3" />
            <p className="text-dark-300 font-medium">No recent files</p>
            <p className="text-sm text-dark-400 mt-1">
              Files you process will appear here for quick access during your session.
            </p>
          </div>
        )}
      </motion.div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link to="/batch" className="rounded-2xl border border-white/10 bg-dark-800/60 p-5 transition-colors hover:border-secondary-500/30">
          <div className="flex items-center gap-3">
            <FolderDown className="h-5 w-5 text-secondary-400" />
            <div className="flex-1">
              <h2 className="font-bold text-dark-100">Batch processing</h2>
              <p className="text-xs text-dark-400">Apply one operation to up to 100 images, then export a ZIP.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-dark-400" />
          </div>
        </Link>
        <Link to="/downloads" className="rounded-2xl border border-white/10 bg-dark-800/60 p-5 transition-colors hover:border-secondary-500/30">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-secondary-400" />
            <div className="flex-1">
              <h2 className="font-bold text-dark-100">Download center</h2>
              <p className="text-xs text-dark-400">{items.length} processed file{items.length === 1 ? '' : 's'} available in this session.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-dark-400" />
          </div>
        </Link>
      </div>
    </PageTransition>
  );
}
