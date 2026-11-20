import { motion } from 'framer-motion';

export default function ProgressBar({ value, label, className = '' }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-dark-300">{label}</span>
          <span className="font-semibold text-secondary-400">{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-dark-700">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-secondary-500 to-primary-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
