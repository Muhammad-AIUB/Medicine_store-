import { Controller, Get } from "@nestjs/common";
import { StoreConfigService } from "./store-config.service";

@Controller("config")
export class StoreConfigController {
  constructor(private readonly storeConfig: StoreConfigService) {}

  @Get()
  getConfig() {
    return this.storeConfig.toDto();
  }
}
