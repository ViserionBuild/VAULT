import { cn } from '../../lib/utils'

export function Badge({ children, className, style, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'border border-border bg-muted text-muted-foreground',
        'transition-colors',
        className,
      )}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}
