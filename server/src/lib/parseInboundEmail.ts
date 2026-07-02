const FROM_HEADER_RE = /^"?([^"<]*?)"?\s*<(.+)>$/;

export type ParsedSender = { email: string; name?: string };

export function parseSender(from: string): ParsedSender {
  const match = from.trim().match(FROM_HEADER_RE);
  if (!match) return { email: from.trim() };

  const [, name, email] = match;
  return { email: email.trim(), name: name.trim() || undefined };
}

export type InboundEmailPayload = {
  from?: string;
  subject?: string;
  text?: string;
  body?: string;
};

export type ParsedInboundEmail = {
  subject: string;
  body: string;
  senderEmail: string;
  senderName?: string;
};

export function parseInboundEmail(payload: InboundEmailPayload): ParsedInboundEmail | null {
  const from = payload.from?.trim();
  const body = (payload.text ?? payload.body)?.trim();
  if (!from || !body) return null;

  const { email, name } = parseSender(from);
  if (!email) return null;

  return {
    subject: payload.subject?.trim() || "(no subject)",
    body,
    senderEmail: email,
    senderName: name,
  };
}
