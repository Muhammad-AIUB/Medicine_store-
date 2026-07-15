import {
  ALLOWED_TRANSITIONS,
  canTransition,
  createOrderSchema,
  formatBdt,
  ORDER_STATUSES,
  phoneSchema,
} from "@medistore/shared";

describe("order state machine", () => {
  it("allows exactly the designed transitions", () => {
    expect(canTransition("NEW", "CONFIRMED")).toBe(true);
    expect(canTransition("NEW", "CANCELLED")).toBe(true);
    expect(canTransition("CONFIRMED", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "CANCELLED")).toBe(true);
  });

  it("terminal states allow nothing; no self-loops or reverse moves", () => {
    expect(ALLOWED_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toHaveLength(0);
    for (const s of ORDER_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
    expect(canTransition("DELIVERED", "NEW")).toBe(false);
    expect(canTransition("CONFIRMED", "NEW")).toBe(false);
  });
});

describe("phoneSchema — BD mobile numbers", () => {
  it.each(["01712345678", "01310000000", "01999999999"])("accepts %s", (n) => {
    expect(phoneSchema.safeParse(n).success).toBe(true);
  });
  it.each(["0171234567", "017123456789", "01212345678", "8801712345678", "hello", ""])("rejects %s", (n) => {
    expect(phoneSchema.safeParse(n).success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  const base = {
    customerName: "Rahim Uddin",
    phone: "01712345678",
    deliveryArea: "Dhanmondi",
    address: "House 12, Road 5, Dhanmondi",
    items: [{ productId: 1, qty: 2 }],
  };

  it("accepts a valid order", () => {
    expect(createOrderSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an empty cart", () => {
    expect(createOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
  it.each([0, -1, 21, 1.5])("rejects qty %s", (qty) => {
    expect(createOrderSchema.safeParse({ ...base, items: [{ productId: 1, qty }] }).success).toBe(false);
  });
  it("rejects a too-short address", () => {
    expect(createOrderSchema.safeParse({ ...base, address: "Dhaka" }).success).toBe(false);
  });
});

describe("formatBdt", () => {
  it("formats whole taka without decimals", () => {
    expect(formatBdt(1200)).toBe("৳12");
  });
  it("formats fractional taka with two decimals", () => {
    expect(formatBdt(650)).toBe("৳6.50");
  });
});
