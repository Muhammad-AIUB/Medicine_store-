import { NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import type { PrismaService } from "../prisma/prisma.service";

function makeMocks() {
  const prisma = {
    product: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  return { service: new ProductsService(prisma as unknown as PrismaService), prisma };
}

describe("ProductsService.publicList", () => {
  it("only ever queries active, non-prescription products (premise 2)", async () => {
    const { service, prisma } = makeMocks();
    await service.publicList();
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, isPrescriptionRequired: false }),
      }),
    );
  });

  it("searches name, generic name, and brand case-insensitively", async () => {
    const { service, prisma } = makeMocks();
    await service.publicList("napa");
    const where = prisma.product.findMany.mock.calls[0][0].where as { OR: unknown[] };
    expect(where.OR).toHaveLength(3);
  });
});

describe("ProductsService.deactivate", () => {
  it("soft-deletes (isActive: false) so order history keeps its product rows", async () => {
    const { service, prisma } = makeMocks();
    prisma.product.findUnique.mockResolvedValue({ id: 5 });
    prisma.product.update.mockResolvedValue({
      id: 5, name: "X", genericName: "x", brand: "", manufacturer: "m", strength: "",
      dosageForm: "Tablet", packUnit: "strip", category: "c", pricePaisa: 100,
      stockQty: 0, imageUrl: null, nearestExpiry: null, isPrescriptionRequired: false, isActive: false,
    });
    await service.deactivate(5);
    expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { isActive: false } });
  });

  it("404s on unknown product", async () => {
    const { service, prisma } = makeMocks();
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.deactivate(999)).rejects.toThrow(NotFoundException);
  });
});
