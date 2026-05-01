type BrandLogoProps = {
  compact?: boolean;
  dark?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, dark = false, className = '' }: BrandLogoProps) {
  return (
    <div className={`brand-logo ${compact ? 'compact' : ''} ${dark ? 'dark' : ''} ${className}`.trim()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img 
        src="/logo.png" 
        alt="Finansialin Logo"
        style={{ height: '48px', width: 'auto', mixBlendMode: 'multiply', objectFit: 'contain' }}
      />
    </div>
  );
}