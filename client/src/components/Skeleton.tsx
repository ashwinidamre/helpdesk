import { cn } from "../lib/utils";

interface Props {
  className?: string;
}

export default function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md bg-muted bg-[length:800px_100%] motion-reduce:animate-none",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 100%)",
      }}
    />
  );
}
