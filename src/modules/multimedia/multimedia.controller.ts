import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { MultimediaService } from './multimedia.service';
import { CreateMultimediaDto, UpdateMultimediaDto } from './dto/multimedia.dto';

@Controller('multimedia')
@ApiTags('Multimedia')
export class MultimediaController {
  constructor(private readonly multimediaService: MultimediaService) {}

  /**
   * Create a new multimedia record
   */
  @Post()
  @ApiOperation({ summary: 'Create new multimedia record' })
  @ApiResponse({
    status: 201,
    description: 'Multimedia created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid multimedia data',
  })
  @ApiBody({ type: CreateMultimediaDto })
  create(@Body() createMultimediaDto: CreateMultimediaDto) {
    return this.multimediaService.create(createMultimediaDto);
  }

  /**
   * Get all multimedia records
   */
  @Get()
  @ApiOperation({ summary: 'Get all multimedia records' })
  @ApiResponse({
    status: 200,
    description: 'List of all multimedia files',
  })
  findAll() {
    return this.multimediaService.findAll();
  }

  /**
   * Get multimedia record by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get multimedia by ID' })
  @ApiResponse({
    status: 200,
    description: 'Multimedia record details',
  })
  @ApiResponse({
    status: 404,
    description: 'Multimedia not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.multimediaService.findOne(id);
  }

  /**
   * Update multimedia record
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update multimedia record' })
  @ApiResponse({
    status: 200,
    description: 'Multimedia updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Multimedia not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateMultimediaDto })
  update(
    @Param('id') id: string,
    @Body() updateMultimediaDto: UpdateMultimediaDto,
  ) {
    return this.multimediaService.update(id, updateMultimediaDto);
  }

  /**
   * Delete multimedia record permanently
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete multimedia record' })
  @ApiResponse({
    status: 200,
    description: 'Multimedia deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Multimedia not found',
  })
  @ApiParam({ name: 'id', type: String })
  hardDelete(@Param('id') id: string) {
    return this.multimediaService.hardDelete(id);
  }

  /**
   * Get multimedia file URL
   */
  @Get(':id/url')
  @ApiOperation({ summary: 'Get multimedia file URL' })
  @ApiResponse({
    status: 200,
    description: 'File URL retrieved',
    schema: {
      example: { url: 'https://example.com/uploads/file.jpg' },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Multimedia not found',
  })
  @ApiParam({ name: 'id', type: String })
  async getUrl(@Param('id') id: string) {
    const url = await this.multimediaService.getUrl(id);
    return { url };
  }

  /**
   * Set SEO title for multimedia
   */
  @Patch(':id/seo-title')
  @ApiOperation({ summary: 'Set multimedia SEO title' })
  @ApiResponse({
    status: 200,
    description: 'SEO title updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Multimedia not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      example: { seoTitle: 'Beautiful Property Image' },
    },
  })
  setSeoTitle(@Param('id') id: string, @Body('seoTitle') seoTitle: string) {
    return this.multimediaService.setSeoTitle(id, seoTitle);
  }
}
