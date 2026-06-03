import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** holographic sweep sheen */
  holo?: boolean;
  /** animated conic border */
  ring?: boolean;
  /** top edge glow line */
  edge?: boolean;
  /** vertical scan beam */
  scan?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  holo = true,
  ring = false,
  edge = true,
  scan = false,
  style,
  onClick,
}: CardProps) {
  const cls = [
    'glass',
    holo ? 'holo' : '',
    ring ? 'ring-border' : '',
    edge ? 'edge-glow' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={style} onClick={onClick}>
      {scan && <div className="scan-beam" />}
      {children}
    </div>
  );
}

interface CardHeaderProps {
  icon?: ReactNode;
  title: string;
  right?: ReactNode;
}

export function CardHeader({ icon, title, right }: CardHeaderProps) {
  return (
    <div className="card-head">
      {icon && <div className="ico">{icon}</div>}
      <h3>{title}</h3>
      {right && <div className="right">{right}</div>}
    </div>
  );
}
