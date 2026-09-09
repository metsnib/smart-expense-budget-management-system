export function ProgressBar({
  value,
  color,
  className = '',
}: {
  value: number // 0-100+, will be clamped for width
  color: string
  className?: string
}) {
  const width = Math.min(100, Math.max(0, value))
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  )
}
