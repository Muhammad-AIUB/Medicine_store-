import type {
  ApiError,
  LoginInput,
  OrderDto,
  OrderStatus,
  ProductDto,
  ProductUpsertInput,
} from "@medistore/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiRequestError extends Error {
  constructor(public readonly body: ApiError) {
    super(body.message);
  }
  get isAuthError() {
    return this.body.statusCode === 401;
  }
}

/**
 * All admin calls ride the httpOnly session cookie (credentials: include)
 * and carry the x-csrf header — cross-site forms can't set custom headers,
 * so SameSite + this header closes CSRF (eng review 3A).
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", "x-csrf": "1", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiRequestError({
      statusCode: 0,
      error: "Network",
      message: "Can't reach the API — is the server running?",
    });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      body ?? { statusCode: res.status, error: "Error", message: "Request failed" },
    );
  }
  return (await res.json()) as T;
}

export const adminApi = {
  login: (input: LoginInput) => request<{ email: string }>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<{ email: string }>("/auth/me"),
  orders: (status?: OrderStatus) => request<OrderDto[]>(`/admin/orders${status ? `?status=${status}` : ""}`),
  setOrderStatus: (id: number, status: OrderStatus) =>
    request<OrderDto>(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  products: () => request<ProductDto[]>("/admin/products"),
  createProduct: (input: ProductUpsertInput) =>
    request<ProductDto>("/admin/products", { method: "POST", body: JSON.stringify(input) }),
  updateProduct: (id: number, input: ProductUpsertInput) =>
    request<ProductDto>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  adjustStock: (id: number, stockQty: number) =>
    request<ProductDto>(`/admin/products/${id}/stock`, { method: "PATCH", body: JSON.stringify({ stockQty }) }),
  deactivateProduct: (id: number) => request<ProductDto>(`/admin/products/${id}`, { method: "DELETE" }),
};
