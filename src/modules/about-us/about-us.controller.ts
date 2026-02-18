import {
  Controller,
  Get,
  Put,
  Body,
  Delete,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AboutUsService } from './about-us.service';
import { UpdateAboutUsDto } from './dto/about-us.dto';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';

@Controller('about-us')
@ApiTags('About Us')
export class AboutUsController {
  constructor(private readonly aboutUsService: AboutUsService) {}

  /**
   * Get about us information
   */
  @Get()
  @ApiOperation({ summary: 'Get about us information' })
  @ApiResponse({
    status: 200,
    description: 'About us content',
  })
  @Audit(AuditAction.READ, AuditEntityType.ABOUT_US, 'About us viewed')
  findOne() {
    return this.aboutUsService.findOne();
  }

  /**
   * Update about us information with optional multimedia
   */
  @Put()
  @ApiOperation({ summary: 'Update about us information' })
  @ApiResponse({
    status: 200,
    description: 'About us updated successfully',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        content: { type: 'string' },
        multimedia: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('multimedia'))
  @Audit(AuditAction.UPDATE, AuditEntityType.ABOUT_US, 'About us updated')
  update(
    @Body(ValidationPipe) updateAboutUsDto: UpdateAboutUsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.aboutUsService.update(updateAboutUsDto, file);
  }

  /**
   * Delete about us information (soft delete)
   */
  @Delete()
  @ApiOperation({ summary: 'Delete about us information' })
  @ApiResponse({
    status: 200,
    description: 'About us deleted successfully',
  })
  @Audit(AuditAction.DELETE, AuditEntityType.ABOUT_US, 'About us deleted')
  softDelete() {
    return this.aboutUsService.softDelete();
  }
}
