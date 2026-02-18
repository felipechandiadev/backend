import { Controller, Get, Query } from '@nestjs/common';
import { REGION_COMMUNES } from '../../common/regions/regions.data';
import { RegionEnum } from '../../common/regions/regions.enum';

@Controller('config')
export class ConfigController {
  @Get('regiones')
  getRegiones() {
    return Object.entries(RegionEnum).map(([key, value]) => ({
      id: value,
      label: value
    }));
  }

  @Get('comunas')
  getComunasByRegion(@Query('region') region: string) {
    console.log('Received region:', region); // Depurar valor recibido
    if (!region || !REGION_COMMUNES[region as RegionEnum]) {
      console.warn(`Invalid region: ${region}`);
      return [];
    }
    return REGION_COMMUNES[region as RegionEnum].map((comuna) => ({
      id: comuna,
      label: comuna,
      stateId: region // Agregar el stateId correspondiente a la región
    }));
  }
}