type ArrowIconProps = {
  className?: string;
  direction?: 'left' | 'right';
  tight?: boolean;
};

export function ArrowIcon({ className, direction = 'right', tight = false }: ArrowIconProps) {
  const path = direction === 'left' ? 'M20 12H4M10 6l-6 6 6 6' : 'M4 12h16M14 6l6 6-6 6';

  return (
    <svg className={className} viewBox={tight ? '0 0 24 24' : '-8 -8 40 40'} aria-hidden="true" fill="none" style={{ translate: tight ? '0 0' : '0 2px' }}>
      <path d={path} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
