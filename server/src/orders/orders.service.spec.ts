import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { StoreConfigService } from "../store-config/store-config.service";

/*
 * Test setup: PrismaService is mocked; $transaction runs the callback with a
 * tx mock whose updateMany returns configurable counts — letting us simulate
 * the exact race conditions the atomic-update design (7A) exists to survive.
 */

const PRODUCT = {
  id: 1,
  name: "Napa",
  strength: "500mg",
  packUnit: "strip of 10",
  pricePaisa: 1200,
  stockQty: 10,
  isActive: true,
  isPrescriptionRequired: false,
};

const ORDER_ITEMS = [{ id: 1, productId: 1, productName: "Napa 500mg", packUnit: "strip of 10", qty: 2, unitPricePaisa: 1200 }];

function makeOrder(status: string) {
  return {
    id: 42,
    customerName: "Rahim Uddin",
    phone: "01712345678",
    deliveryArea: "Dhanmondi",
    address: "House 12, Road 5",
    status,
    subtotalPaisa: 2400,
    deliveryFeePaisa: 6000,
    totalPaisa: 8400,
    createdAt: new Date("2026-07-15T10:00:00Z"),
    updatedAt: new Date("2026-07-15T10:00:00Z"),
    items: ORDER_ITEMS,
  };
}

function makeMocks() {
  const tx = {
    product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    product: { findMany: jest.fn() },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  };
  const storeConfig = {
    servedAreas: ["Dhanmondi"],
    deliveryFeePaisa: 6000,
    deliveryCutoffHour: 18,
    supportPhone: "01700000000",
  };
  const service = new OrdersService(prisma as unknown as PrismaService, storeConfig as unknown as StoreConfigService);
  return { service, prisma, tx };
}

const VALID_INPUT = {
  customerName: "Rahim Uddin",
  phone: "01712345678",
  deliveryArea: "Dhanmondi",
  address: "House 12, Road 5, Dhanmondi",
  items: [{ productId: 1, qty: 2 }],
};

describe("OrdersService.create", () => {
  it("rejects out-of-area orders with the served-area list in the message", async () => {
    const { service } = makeMocks();
    await expect(service.create({ ...VALID_INPUT, deliveryArea: "Uttara" })).rejects.toThrow(BadRequestException);
    await expect(service.create({ ...VALID_INPUT, deliveryArea: "Uttara" })).rejects.toThrow(/Dhanmondi/);
  });

  it("rejects duplicate line items", async () => {
    const { service } = makeMocks();
    const input = { ...VALID_INPUT, items: [{ productId: 1, qty: 1 }, { productId: 1, qty: 2 }] };
    await expect(service.create(input)).rejects.toThrow(/Duplicate items/);
  });

  it("rejects unknown, inactive, or Rx products (they never come back from the filtered query)", async () => {
    const { service, prisma } = makeMocks();
    prisma.product.findMany.mockResolvedValue([]); // filtered query returns nothing
    await expect(service.create(VALID_INPUT)).rejects.toThrow(/not available/);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, isPrescriptionRequired: false }),
      }),
    );
  });

  it("rejects when requested qty exceeds stock", async () => {
    const { service, prisma } = makeMocks();
    prisma.product.findMany.mockResolvedValue([{ ...PRODUCT, stockQty: 1 }]);
    await expect(service.create(VALID_INPUT)).rejects.toThrow(/only 1 in stock/);
  });

  it("computes totals from DATABASE prices plus config delivery fee — never client prices", async () => {
    const { service, prisma } = makeMocks();
    prisma.product.findMany.mockResolvedValue([PRODUCT]);
    prisma.order.create.mockResolvedValue(makeOrder("NEW"));
    await service.create(VALID_INPUT);
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalPaisa: 2400, // 2 × 1200 from DB
          deliveryFeePaisa: 6000,
          totalPaisa: 8400,
        }),
      }),
    );
  });

  it("does NOT touch stock at order creation (decrement happens at CONFIRMED)", async () => {
    const { service, prisma, tx } = makeMocks();
    prisma.product.findMany.mockResolvedValue([PRODUCT]);
    prisma.order.create.mockResolvedValue(makeOrder("NEW"));
    await service.create(VALID_INPUT);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });
});

describe("OrdersService.transition", () => {
  it("404s on unknown order", async () => {
    const { service, prisma } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.transition(99, "CONFIRMED")).rejects.toThrow(NotFoundException);
  });

  it.each([
    ["DELIVERED", "CONFIRMED"],
    ["CANCELLED", "CONFIRMED"],
    ["NEW", "DELIVERED"],
    ["NEW", "OUT_FOR_DELIVERY"],
  ])("rejects illegal transition %s → %s", async (from, to) => {
    const { service, prisma } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(makeOrder(from));
    await expect(service.transition(42, to as never)).rejects.toThrow(ConflictException);
  });

  it("NEW→CONFIRMED decrements stock atomically with the gte precondition in WHERE", async () => {
    const { service, prisma, tx } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(makeOrder("NEW"));
    await service.transition(42, "CONFIRMED");
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 1, stockQty: { gte: 2 } },
      data: { stockQty: { decrement: 2 } },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: "NEW" },
      data: { status: "CONFIRMED" },
    });
  });

  it("insufficient stock at confirm (0 rows) → Conflict, order stays NEW", async () => {
    const { service, prisma, tx } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(makeOrder("NEW"));
    tx.product.updateMany.mockResolvedValue({ count: 0 }); // the race: stock ran out
    await expect(service.transition(42, "CONFIRMED")).rejects.toThrow(/Insufficient stock/);
    expect(tx.order.updateMany).not.toHaveBeenCalled(); // transaction aborted before status write
  });

  it("concurrent double-confirm (status row already moved) → Conflict", async () => {
    const { service, prisma, tx } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(makeOrder("NEW"));
    tx.order.updateMany.mockResolvedValue({ count: 0 }); // another request won
    await expect(service.transition(42, "CONFIRMED")).rejects.toThrow(/changed by another request/);
  });

  it("cancelling a NEW order restores NOTHING (stock was never taken)", async () => {
    const { service, prisma, tx } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(makeOrder("NEW"));
    await service.transition(42, "CANCELLED");
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it.each(["CONFIRMED", "OUT_FOR_DELIVERY"])(
    "cancelling from %s restores each item's stock",
    async (from) => {
      const { service, prisma, tx } = makeMocks();
      prisma.order.findUnique.mockResolvedValue(makeOrder(from));
      await service.transition(42, "CANCELLED");
      expect(tx.product.updateMany).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stockQty: { increment: 2 } },
      });
    },
  );

  it("OUT_FOR_DELIVERY→DELIVERED updates status only", async () => {
    const { service, prisma, tx } = makeMocks();
    prisma.order.findUnique.mockResolvedValue(makeOrder("OUT_FOR_DELIVERY"));
    await service.transition(42, "DELIVERED");
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 42, status: "OUT_FOR_DELIVERY" },
      data: { status: "DELIVERED" },
    });
  });
});
