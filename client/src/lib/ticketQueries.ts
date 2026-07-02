import type { QueryClient } from "@tanstack/react-query";

export function invalidateTicketQueries(queryClient: QueryClient, id: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ["ticket", id] });
  queryClient.invalidateQueries({ queryKey: ["tickets"] });
}
