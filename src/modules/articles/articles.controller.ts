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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/article.dto';

@Controller('articles')
@ApiTags('Articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  /**
   * Create a new article with optional image
   */
  @Post()
  @ApiOperation({ summary: 'Create new article' })
  @ApiResponse({
    status: 201,
    description: 'Article created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        category: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body(ValidationPipe) createArticleDto: CreateArticleDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.articlesService.create(createArticleDto, image);
  }

  /**
   * Get all articles with optional filters
   */
  @Get()
  @ApiOperation({ summary: 'Get all articles' })
  @ApiResponse({
    status: 200,
    description: 'List of articles',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  findAll(@Query('search') search?: string, @Query('category') category?: string) {
    return this.articlesService.findAll(search, category);
  }

  /**
   * Get article by ID with related articles
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get article by ID with related articles' })
  @ApiResponse({
    status: 200,
    description: 'Article details with related articles',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    const article = await this.articlesService.findOne(id);
    const relatedArticles = await this.articlesService.findRelated(id, 4);

    return {
      ...article,
      relatedArticles,
    };
  }

  /**
   * Update article with optional image
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update article' })
  @ApiResponse({
    status: 200,
    description: 'Article updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        category: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateArticleDto: UpdateArticleDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.articlesService.update(id, updateArticleDto, image);
  }

  /**
   * Delete article (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete article' })
  @ApiResponse({
    status: 200,
    description: 'Article deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Article not found',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(@Param('id') id: string) {
    return this.articlesService.softDelete(id);
  }

  /**
   * Toggle article active status
   */
  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle article active status' })
  @ApiResponse({
    status: 200,
    description: 'Active status toggled',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      example: { isActive: true },
    },
  })
  toggleActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.articlesService.toggleActive(id, body.isActive);
  }
}
