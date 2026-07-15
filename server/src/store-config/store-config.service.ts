import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StoreConfigDto } from "@medistore/shared";

@Injectable()
export class StoreConfigService {
  constructor(private readonly config: ConfigService) {}

  get servedAreas(): string[] {
    return (this.config.get<string>("SERVED_AREAS") ?? "Dhanmondi")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  get deliveryFeePaisa(): number {
    return Number(this.config.get<string>("DELIVERY_FEE_BDT") ?? "60") * 100;
  }

  get deliveryCutoffHour(): number {
    return Number(this.config.get<string>("DELIVERY_CUTOFF_HOUR") ?? "18");
  }

  get supportPhone(): string {
    return this.config.get<string>("SUPPORT_PHONE") ?? "";
  }

  toDto(): StoreConfigDto {
    return {
      servedAreas: this.servedAreas,
      deliveryFeePaisa: this.deliveryFeePaisa,
      deliveryCutoffHour: this.deliveryCutoffHour,
      supportPhone: this.supportPhone,
    };
  }
}
