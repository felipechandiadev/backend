import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  Body,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from '../services/documents.service';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentUploadDto } from '../interfaces/document.interface';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
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
        documentTypeId: {
          type: 'string',
          format: 'uuid',
        },
        description: {
          type: 'string',
        },
        metadata: {
          type: 'object',
          properties: {
            seoTitle: { type: 'string' },
            altText: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      required: ['file', 'documentTypeId'],
    },
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentTypeId') documentTypeId: string,
    @Body('description') description?: string,
    @Body('metadata') metadata?: string,
  ) {
    let parsedMetadata;
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (error) {
        parsedMetadata = undefined;
      }
    }

    return await this.documentsService.uploadDocument({
      file,
      documentTypeId,
      description,
      metadata: parsedMetadata,
    });
  }

  @Get('type/:documentTypeId')
  async getDocumentsByType(@Param('documentTypeId') documentTypeId: string) {
    return await this.documentsService.getDocumentsByType(documentTypeId);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    await this.documentsService.deleteDocument(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Document deleted successfully',
    };
  }
}
