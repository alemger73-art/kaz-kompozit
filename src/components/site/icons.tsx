/** Минималистичные иконки (stroke). */
type IconProps = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const IconArrow = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} {...base}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const IconPhone = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} {...base}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
);
export const IconCart = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} {...base}><path d="M4 5h2l2 11h10l2-8H7" /><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
);
export const IconHeart = ({ className, filled }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} {...base} fill={filled ? 'currentColor' : 'none'}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
);
export const IconCompare = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} {...base}><path d="M7 4v16M17 4v16M3 8h8M13 16h8" /></svg>
);
export const IconCheck = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} {...base}><path d="M5 12l4 4 10-10" /></svg>
);
export const IconWarning = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} {...base}><path d="M12 3l9 16H3zM12 10v4M12 17v.5" /></svg>
);
export const IconMenu = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-6 w-6'} {...base}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const IconClose = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-6 w-6'} {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconTruck = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-6 w-6'} {...base}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
);
export const IconWhatsapp = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} {...base}><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8c-.3 1.2-1.3 1.9-2.4 1.6A7 7 0 0 1 8.3 10c-.3-1.1.4-2.1 1.6-2.4l.8 1.8z" /></svg>
);
