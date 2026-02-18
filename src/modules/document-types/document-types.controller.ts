import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentTypesService } from './document-types.service';
import {
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
  UploadFileDto,
  UploadDocumentDto,
} from './dto/document-type.dto';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Express } from 'express';

@ApiTags('Document Types')
@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly documentTypesService: DocumentTypesService) {}

  /**
   * Create a new document type
   */
  @Post()
  @ApiOperation({ summary: 'Create new document type' })
  @ApiResponse({
    status: 201,
    description: 'Document type created successfully',
  })
  @ApiBody({ type: CreateDocumentTypeDto })
  create(@Body() createDocumentTypeDto: CreateDocumentTypeDto) {
    return this.documentTypesService.create(createDocumentTypeDto);
  }

  /**
   * Get all document types
   */
  @Get()
  @ApiOperation({ summary: 'Get all document types' })
  @ApiResponse({
    status: 200,
    description: 'List of all document types',
  })
  findAll() {
    return this.documentTypesService.findAll();
  }

  /**
   * Get document type by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get document type by ID' })
  @ApiResponse({
    status: 200,
    description: 'Document type details',
  })
  @ApiResponse({
    status: 404,
    description: 'Document type not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.documentTypesService.findOne(id);
  }

  /**
   * Update document type
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update document type' })
  @ApiResponse({
    status: 200,
    description: 'Document type updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateDocumentTypeDto })
  update(
    @Param('id') id: string,
    @Body() updateDocumentTypeDto: UpdateDocumentTypeDto,
  ) {
    return this.documentTypesService.update(id, updateDocumentTypeDto);
  }

  /**
   * Delete document type (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete document type' })
  @ApiResponse({
    status: 200,
    description: 'Document type deleted successfully',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(@Param('id') id: string) {
    return this.documentTypesService.softDelete(id);
  }

  /**
   * Set document type availability status
   */
  @Patch(':id/available')
  @ApiOperation({ summary: 'Set document type availability' })
  @ApiResponse({
    status: 200,
    description: 'Availability status updated',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      example: { available: true },
    },
  })
  setAvailable(@Param('id') id: string, @Body('available') available: boolean) {
    return this.documentTypesService.setAvailable(id, available);
  }

  /**
   * Upload a file for document type
   */
  @Post('upload-file')
  @ApiOperation({ summary: 'Upload file for document type' })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
  })
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
        seoTitle: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        uploadedById: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    return this.documentTypesService.uploadFile(file, uploadFileDto);
  }

  /**
   * Upload a document with specified type
   */
  @Post('upload-document')
  @ApiOperation({ summary: 'Upload document with type' })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
  })
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
      },
    },
  })
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    return this.documentTypesService.uploadDocument(file, uploadDocumentDto);
  }
}
