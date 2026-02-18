import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PredictService } from './predict.service';
import { PredictPropertyDto, PredictPropertyResponseDto } from './dto/predict-property.dto';

@ApiTags('Predicción')
@Controller('predict')
export class PredictController {
  constructor(private readonly predictService: PredictService) {}

  @Post('property-value')
  @ApiOperation({ 
    summary: 'Predecir valor de propiedad',
    description: 'Calcula el valor estimado de una propiedad basándose en sus características (ubicación, tipo, metros cuadrados, etc.). Endpoint público.'
  })
  @ApiBody({ type: PredictPropertyDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Predicción realizada exitosamente',
    type: PredictPropertyResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async predictPropertyValue(
    @Body() dto: PredictPropertyDto,
  ): Promise<PredictPropertyResponseDto> {
    return this.predictService.predictValue(dto);
  }

  @Get('regiones')
  @ApiOperation({ 
    summary: 'Listar regiones disponibles',
    description: 'Retorna la lista de regiones de Chile disponibles para la predicción. Endpoint público.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de regiones',
    type: [String]
  })
  getRegiones(): string[] {
    return this.predictService.getRegiones();
  }

  @Get('tipos-propiedad')
  @ApiOperation({ 
    summary: 'Listar tipos de propiedad',
    description: 'Retorna la lista de tipos de propiedad soportados por el modelo de predicción. Endpoint público.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de tipos de propiedad',
    type: [String]
  })
  getTiposPropiedad(): string[] {
    return this.predictService.getTiposPropiedad();
  }

  @Get('status')
  @ApiOperation({ 
    summary: 'Estado del servicio de predicción',
    description: 'Verifica si el modelo de predicción está cargado y disponible. Endpoint público.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado del servicio',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        model_loaded: { type: 'boolean', example: true },
        version: { type: 'string', example: 'v3' }
      }
    }
  })
  getStatus() {
    return {
      status: 'ok',
      model_loaded: this.predictService.isModelLoaded(),
      version: 'v3',
    };
  }
}
