import { describe, test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import ReplyThread from "./ReplyThread";
import type { Reply } from "../types/ticket";

const replies: Reply[] = [
  {
    id: "r1",
    body: "First reply",
    ticketId: "t1",
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "r2",
    body: "Second reply",
    ticketId: "t1",
    createdAt: "2026-07-02T10:00:00.000Z",
  },
];

describe("ReplyThread", () => {
  test("renders nothing when there are no replies", () => {
    const { container } = render(<ReplyThread replies={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders a heading and every reply's body", () => {
    render(<ReplyThread replies={replies} />);

    expect(screen.getByText("Replies")).toBeInTheDocument();
    expect(screen.getByText("First reply")).toBeInTheDocument();
    expect(screen.getByText("Second reply")).toBeInTheDocument();
  });

  test("renders replies in the order given, without re-sorting", () => {
    render(<ReplyThread replies={replies} />);

    const bodies = screen.getAllByText(/reply$/i).map((el) => el.textContent);
    expect(bodies).toEqual(["First reply", "Second reply"]);
  });

  test("formats each reply's createdAt as a localized date string", () => {
    render(<ReplyThread replies={[replies[0]]} />);

    const expected = new Date(replies[0].createdAt).toLocaleString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
