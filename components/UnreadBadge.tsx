interface UnreadBadgeProps {
  count: number;
  className?: string;
  dot?: boolean;
}

export default function UnreadBadge({ count, className = "", dot = false }: UnreadBadgeProps) {
  if (count <= 0) return null;

  if (dot) {
    return (
      <span
        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white ${className}`}
      />
    );
  }

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold leading-none ${className}`}
    >
      {label}
    </span>
  );
}
