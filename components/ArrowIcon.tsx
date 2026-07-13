type ArrowIconProps = {
  className?: string;
  direction?: 'left' | 'right';
};

export function ArrowIcon({ className, direction = 'right' }: ArrowIconProps) {
  const path = direction === 'left' ? 'M20 12H4M10 6l-6 6 6 6' : 'M4 12h16M14 6l6 6-6 6';

  return (
    <svg className={className} viewBox="-8 -8 40 40" aria-hidden="true" fill="none" style={{ translate: '0 2px' }}>
      <path d={path} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
