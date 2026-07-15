import { Injectable, NotFoundException } from "@nestjs/common";
import type { ProductDto, ProductUpsertInput } from "@medistore/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { Product } from "../generated/prisma/client";

export function toProductDto(p: Product): ProductDto {
  return {
    id: p.id,
    name: p.name,
    genericName: p.genericName,
    brand: p.brand,
    manufacturer: p.manufacturer,
    strength: p.strength,
    dosageForm: p.dosageForm,
    packUnit: p.packUnit,
    category: p.category,
    pricePaisa: p.pricePaisa,
    stockQty: p.stockQty,
    imageUrl: p.imageUrl,
    nearestExpiry: p.nearestExpiry?.toISOString() ?? null,
    isPrescriptionRequired: p.isPrescriptionRequired,
    isActive: p.isActive,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public catalog: active, non-prescription items only (premise 2 — Rx
   * items are never shown to the storefront until licensing is resolved).
   */
  async publicList(q?: string, category?: string): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        isPrescriptionRequired: false,
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { genericName: { contains: q, mode: "insensitive" } },
                { brand: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return products.map(toProductDto);
  }

  async publicCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true, isPrescriptionRequired: false },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category);
  }

  /* ---------------- admin ---------------- */

  async adminList(): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany({ orderBy: { name: "asc" } });
    return products.map(toProductDto);
  }

  async create(input: ProductUpsertInput): Promise<ProductDto> {
    const p = await this.prisma.product.create({ data: input });
    return toProductDto(p);
  }

  async update(id: number, input: ProductUpsertInput): Promise<ProductDto> {
    await this.ensureExists(id);
    const p = await this.prisma.product.update({ where: { id }, data: input });
    return toProductDto(p);
  }

  async adjustStock(id: number, stockQty: number): Promise<ProductDto> {
    await this.ensureExists(id);
    const p = await this.prisma.product.update({ where: { id }, data: { stockQty } });
    return toProductDto(p);
  }

  /** Soft delete — order history references products, so rows never disappear. */
  async deactivate(id: number): Promise<ProductDto> {
    await this.ensureExists(id);
    const p = await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    return toProductDto(p);
  }

  private async ensureExists(id: number): Promise<void> {
    const found = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(`Product ${id} not found`);
  }
}
