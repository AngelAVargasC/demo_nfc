export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ui_skeleton">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="ui_skeleton_line" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  )
}
