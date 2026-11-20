import { forwardRef } from 'react';

const variants = {
  primary:
    'bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-600 text-white shadow-lg shadow-primary-500/25',
  secondary:
    'bg-gradient-to-r from-secondary-500 to-secondary-400 hover:from-secondary-400 hover:to-secondary-300 text-dark-950 shadow-lg shadow-secondary-500/25',
  accent:
    'bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-400 hover:to-accent-300 text-dark-900 shadow-lg shadow-accent-500/25',
  ghost: 'bg-white/5 hover:bg-white/10 text-dark-100 border border-white/10',
  outline: 'bg-transparent hover:bg-white/5 text-dark-100 border border-white/15',
  danger: 'bg-gradient-to-r from-error-600 to-error-500 hover:from-error-500 hover:to-error-400 text-white',
  subtle: 'bg-white/5 hover:bg-white/10 text-dark-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
  xl: 'px-8 py-3.5 text-lg gap-3',
  icon: 'p-2.5',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, disabled, loading, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 -ml-1" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
});

export default Button;
