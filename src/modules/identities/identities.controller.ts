import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IdentitiesService } from './identities.service';
import { CreateIdentityDto, UpdateIdentityDto } from './dto/identity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';

// Interceptor para transformar campos JSON stringified antes de validación
@Injectable()
export class TransformJsonFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Transformar campos JSON stringified antes de validación
    const jsonFields = ['socialMedia', 'partnerships', 'faqs'];
    jsonFields.forEach(field => {
      if (body[field] && typeof body[field] === 'string') {
        try {
          body[field] = JSON.parse(body[field]);
          console.log(`Parsed ${field} in interceptor:`, body[field]);
        } catch (error) {
          console.warn(`Failed to parse JSON field ${field} in interceptor:`, error);
        }
      } else {
        console.log(`${field} not parsed - value:`, body[field], 'type:', typeof body[field]);
      }
    });

    return next.handle().pipe(
      map(data => data),
    );
  }
}

@Controller('identities')
@ApiTags('Identities')
@UseInterceptors(AuditInterceptor)
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  /**
   * Create a new identity with optional logo and partnership logos
   */
  @Post()
  @ApiOperation({ summary: 'Create new identity' })
  @ApiResponse({
    status: 201,
    description: 'Identity created successfully',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        logo: { type: 'string', format: 'binary' },
        partnershipLogos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.CREATE, AuditEntityType.IDENTITY, 'Identity created')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'partnershipLogos', maxCount: 10 },
    ]),
    TransformJsonFieldsInterceptor,
  )
  create(
    @Body(ValidationPipe) createIdentityDto: CreateIdentityDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      partnershipLogos?: Express.Multer.File[];
    },
  ) {
    return this.identitiesService.create(createIdentityDto, files);
  }

  /**
   * Update identity with optional logo and partnership logos
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update identity' })
  @ApiResponse({
    status: 200,
    description: 'Identity updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        logo: { type: 'string', format: 'binary' },
        partnershipLogos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.UPDATE, AuditEntityType.IDENTITY, 'Identity updated')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'partnershipLogos', maxCount: 10 },
    ]),
    TransformJsonFieldsInterceptor,
  )
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateIdentityDto: UpdateIdentityDto,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      partnershipLogos?: Express.Multer.File[];
    },
  ) {
    return this.identitiesService.update(id, updateIdentityDto, files);
  }

  /**
   * Get all identities
   */
  @Get()
  @ApiOperation({ summary: 'Get all identities' })
  @ApiResponse({
    status: 200,
    description: 'List of all identities',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.IDENTITY, 'Identities listed')
  findAll() {
    return this.identitiesService.findAll();
  }

  /**
   * Get the most recent identity
   */
  @Get('last')
  @ApiOperation({ summary: 'Get last identity' })
  @ApiResponse({
    status: 200,
    description: 'Last identity record',
  })
  @Audit(AuditAction.READ, AuditEntityType.IDENTITY, 'Last identity retrieved')
  findLast() {
    return this.identitiesService.findLast();
  }

  /**
   * Get logo URL from current identity
   */
  @Get('logo-url')
  @ApiOperation({ summary: 'Get logo URL' })
  @ApiResponse({
    status: 200,
    description: 'Logo URL retrieved',
    schema: {
      example: { logoUrl: 'https://example.com/uploads/logo.png' },
    },
  })
  async getLogoUrl() {
    return await this.identitiesService.getLogoUrl();
  }

  /**
   * Get identity by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get identity by ID' })
  @ApiResponse({
    status: 200,
    description: 'Identity details',
  })
  @ApiResponse({
    status: 404,
    description: 'Identity not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Audit(AuditAction.READ, AuditEntityType.IDENTITY, 'Identity viewed')
  findOne(@Param('id') id: string) {
    return this.identitiesService.findOne(id);
  }
}
