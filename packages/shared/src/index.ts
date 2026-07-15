import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Order state machine                                                  */
/*                                                                      */
/* NEW ──confirm──▶ CONFIRMED ──▶ OUT_FOR_DELIVERY ──▶ DELIVERED        */
/*  │                   │                │                              */
/*  └──reject──▶ CANCELLED ◀─────────────┘ (refused at door)            */
/*                                                                      */
/* Stock decrements on NEW→CONFIRMED and is restored on CANCELLED only  */
/* if the order had previously reached CONFIRMED.                       */
/* ------------------------------------------------------------------ */

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ------------------------------------------------------------------ */
/* Money: prices are stored as integer poisha (1 BDT = 100 poisha)      */
/* so ৳6.50 sachets don't force floats into the database.               */
/* ------------------------------------------------------------------ */

export function formatBdt(paisa: number): string {
  const taka = paisa / 100;
  return `৳${Number.isInteger(taka) ? taka : taka.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/* API error envelope (eng review 5A) — every server error uses this    */
/* ------------------------------------------------------------------ */

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, string[]>;
}

/* ------------------------------------------------------------------ */
/* zod schemas (eng review 4A) — single source of validation truth      */
/* ------------------------------------------------------------------ */

/** Bangladeshi mobile number, e.g. 01712345678 (11 digits, 013-019). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, "Enter a valid 11-digit mobile number (01XXXXXXXXX)");

export const orderItemInputSchema = z.object({
  productId: z.number().int().positive(),
  qty: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(20, "Maximum 20 per item — call us for bulk orders"),
});

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Name is too short")
    .max(100, "Name is too long"),
  phone: phoneSchema,
  deliveryArea: z.string().trim().min(1, "Select a delivery area"),
  address: z
    .string()
    .trim()
    .min(8, "Address is too short — include house/road")
    .max(300, "Address is too long"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "Cart is empty")
    .max(30, "Too many line items"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const productUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  genericName: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(120).optional().default(""),
  manufacturer: z.string().trim().min(2).max(120),
  strength: z.string().trim().max(60).optional().default(""),
  dosageForm: z.string().trim().min(2).max(60),
  packUnit: z.string().trim().min(2).max(60),
  category: z.string().trim().min(2).max(60),
  pricePaisa: z.number().int().positive().max(10_000_000),
  stockQty: z.number().int().min(0).max(100_000),
  imageUrl: z.string().trim().url().nullable().optional(),
  nearestExpiry: z.coerce.date().nullable().optional(),
  isPrescriptionRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/* ------------------------------------------------------------------ */
/* API response shapes                                                  */
/* ------------------------------------------------------------------ */

export interface ProductDto {
  id: number;
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  packUnit: string;
  category: string;
  pricePaisa: number;
  stockQty: number;
  imageUrl: string | null;
  nearestExpiry: string | null;
  isPrescriptionRequired: boolean;
  isActive: boolean;
}

export interface OrderItemDto {
  id: number;
  productId: number;
  productName: string;
  packUnit: string;
  qty: number;
  unitPricePaisa: number;
}

export interface OrderDto {
  id: number;
  customerName: string;
  phone: string;
  deliveryArea: string;
  address: string;
  status: OrderStatus;
  subtotalPaisa: number;
  deliveryFeePaisa: number;
  totalPaisa: number;
  createdAt: string;
  items: OrderItemDto[];
}

export interface StoreConfigDto {
  servedAreas: string[];
  deliveryFeePaisa: number;
  deliveryCutoffHour: number;
  supportPhone: string;
}
