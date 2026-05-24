/**
 * Ortak Eduvia marka logosu (landing ile aynı dosya: /public/eduvia-logo.png).
 * @param {{ variant?: 'sidebar' | 'login' | 'compact', className?: string }} props
 */
export default function EduviaLogo({ variant = 'sidebar', className = '' }) {
  const variantClass =
    variant === 'login'
      ? 'brand-logo brand-logo--login'
      : variant === 'compact'
        ? 'brand-logo brand-logo--compact'
        : 'brand-logo brand-logo--sidebar';

  return (
    <img
      src="/eduvia-logo.png"
      alt="Eduvia"
      className={`${variantClass}${className ? ` ${className}` : ''}`}
    />
  );
}
