import { Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  label?: boolean;
  className?: string;
}

export default function AiSeal({ label = true, className }: Props) {
  return (
    <span
      title="Resolved by AI"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-brass/40 bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground shadow-seal transition-transform motion-safe:hover:scale-105",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {label && "Resolved by AI"}
    </span>
  );
}
