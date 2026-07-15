import type { ApiError, CreateOrderInput, OrderDto, ProductDto, StoreConfigDto } from "@medistore/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiRequestError extends Error {
  constructor(public readonly body: ApiError) {
    super(body.message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiRequestError({
      statusCode: 0,
      error: "Network",
      message: "Can't reach the store right now — check your connection and try again.",
    });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      body ?? { statusCode: res.status, error: "Error", message: "Something went wrong. Please try again." },
    );
  }
  return (await res.json()) as T;
}

export const api = {
  products: (q?: string, category?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const qs = params.toString();
    return request<ProductDto[]>(`/products${qs ? `?${qs}` : ""}`);
  },
  categories: () => request<string[]>("/products/categories"),
  config: () => request<StoreConfigDto>("/config"),
  createOrder: (input: CreateOrderInput) =>
    request<OrderDto>("/orders", { method: "POST", body: JSON.stringify(input) }),
  getOrder: (id: number) => request<OrderDto>(`/orders/${id}`),
};
