import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  UploadDocumentDto,
  UploadDNIDto,
} from './dto/document.dto';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Express, Request } from 'express';
import { JweAuthGuard } from '../../auth/jwe/jwe-auth.guard';

type AuthenticatedRequest = Request & { user?: { id?: string } };

@ApiTags('Documents')
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Create a new document record
   */
  @Post()
  @ApiOperation({ summary: 'Create new document' })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
  })
  @ApiBody({ type: CreateDocumentDto })
  create(@Body(ValidationPipe) createDocumentDto: CreateDocumentDto) {
    return this.documentService.create(createDocumentDto);
  }

  /**
   * Upload a document file
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload document file' })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
  })
  @UseGuards(JweAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
        },
        documentTypeId: {
          type: 'string',
          format: 'uuid',
        },
        uploadedById: {
          type: 'string',
          format: 'uuid',
        },
        personId: {
          type: 'string',
          format: 'uuid',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'UPLOADED', 'RECIBIDO', 'REJECTED'],
        },
        notes: {
          type: 'string',
        },
        seoTitle: {
          type: 'string',
        },
        required: {
          type: 'boolean',
        },
      },
    },
  })
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body(ValidationPipe) uploadDocumentDto: UploadDocumentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    uploadDocumentDto.uploadedById ??= userId;
    if (!uploadDocumentDto.uploadedById) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const resolvedDto: UploadDocumentDto & { uploadedById: string } = {
      ...uploadDocumentDto,
      uploadedById: uploadDocumentDto.uploadedById,
    };
    return this.documentService.uploadDocument(file, resolvedDto);
  }

  /**
   * Upload a DNI file (frontal or trasero)
   */
  @Post('upload-dni')
  @ApiOperation({ summary: 'Upload DNI file' })
  @ApiResponse({
    status: 201,
    description: 'DNI uploaded successfully',
  })
  @UseGuards(JweAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        dniSide: {
          type: 'string',
          enum: ['FRONT', 'REAR'],
        },
        uploadedById: {
          type: 'string',
          format: 'uuid',
        },
        personId: {
          type: 'string',
          format: 'uuid',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'UPLOADED', 'RECIBIDO', 'REJECTED'],
        },
      },
    },
  })
  uploadDNI(
    @UploadedFile() file: Express.Multer.File,
    @Body(ValidationPipe) uploadDNIDto: UploadDNIDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    uploadDNIDto.uploadedById ??= userId;
    if (!uploadDNIDto.uploadedById) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const resolvedDto: UploadDNIDto & { uploadedById: string } = {
      ...uploadDNIDto,
      uploadedById: uploadDNIDto.uploadedById,
    };
    return this.documentService.uploadDNI(file, resolvedDto);
  }

  /**
   * Get all documents
   */
  @Get()
  @ApiOperation({ summary: 'Get all documents (optionally filtered by personId)' })
  @ApiResponse({
    status: 200,
    description: 'List of all documents',
  })
  findAll(@Body() body: any, @Req() req: AuthenticatedRequest) {
    // Support ?personId=... as query param
    const personId = req.query?.personId;
    const contractId = req.query?.contractId;
    if (personId) {
      return this.documentService.findByPersonId(String(Array.isArray(personId) ? personId[0] : personId));
    }
    if (contractId) {
      return this.documentService.findByContractId(String(Array.isArray(contractId) ? contractId[0] : contractId));
    }
    return this.documentService.findAll();
  }

  /**
   * Get document by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document details',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  /**
   * Update document
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDocumentDto })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentService.update(id, updateDocumentDto);
  }

  /**
   * Delete document (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(@Param('id') id: string) {
    return this.documentService.softDelete(id);
  }
}
