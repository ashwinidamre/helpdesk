import axios, { isAxiosError } from "axios";

const client = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

async function request<T>(path: string, config?: Parameters<typeof client.request>[0]): Promise<T> {
  try {
    const res = await client.request<T>({ url: path, ...config });
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      const message = (err.response?.data as { error?: string } | undefined)?.error;
      throw new Error(message ?? err.message ?? "Request failed");
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", data: body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", data: body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
