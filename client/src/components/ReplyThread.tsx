import type { Reply } from "../types/ticket";

interface Props {
  replies: Reply[];
}

export default function ReplyThread({ replies }: Props) {
  if (replies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Replies
      </h2>
      {replies.map((reply) => (
        <div
          key={reply.id}
          className="animate-fade-up rounded-[var(--radius)] border border-forest/25 border-l-2 border-l-forest bg-card p-4 shadow-card motion-reduce:animate-none"
        >
          <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground/90">
            {reply.body}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(reply.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
