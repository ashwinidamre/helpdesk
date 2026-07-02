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
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Replies
      </h2>
      {replies.map((reply) => (
        <div key={reply.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="whitespace-pre-wrap text-sm text-gray-700">{reply.body}</p>
          <p className="mt-2 text-xs text-gray-400">
            {new Date(reply.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
