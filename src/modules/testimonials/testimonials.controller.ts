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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TestimonialsService } from './testimonials.service';
import {
  CreateTestimonialDto,
  UpdateTestimonialDto,
} from './dto/testimonial.dto';

@Controller('testimonials')
@ApiTags('Testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  /**
   * Get public testimonials (published and active)
   */
  @Get('public')
  @ApiOperation({ summary: 'Get public testimonials' })
  @ApiResponse({
    status: 200,
    description: 'List of public testimonials',
  })
  async listPublicTestimonials() {
    return await this.testimonialsService.listPublic();
  }

  /**
   * Create a new testimonial with optional image
   */
  @Post()
  @ApiOperation({ summary: 'Create new testimonial' })
  @ApiResponse({
    status: 201,
    description: 'Testimonial created successfully',
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
        author: { type: 'string' },
        rating: { type: 'number', example: 5 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body(ValidationPipe) createTestimonialDto: CreateTestimonialDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.testimonialsService.create(createTestimonialDto, image);
  }

  /**
   * Get all testimonials
   */
  @Get()
  @ApiOperation({ summary: 'Get all testimonials' })
  @ApiResponse({
    status: 200,
    description: 'List of all testimonials',
  })
  findAll() {
    return this.testimonialsService.findAll();
  }

  /**
   * Get testimonial by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get testimonial by ID' })
  @ApiResponse({
    status: 200,
    description: 'Testimonial details',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimonial not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.testimonialsService.findOne(id);
  }

  /**
   * Update testimonial with optional image
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update testimonial' })
  @ApiResponse({
    status: 200,
    description: 'Testimonial updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimonial not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        author: { type: 'string' },
        rating: { type: 'number', example: 5 },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateTestimonialDto: UpdateTestimonialDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.testimonialsService.update(id, updateTestimonialDto, image);
  }

  /**
   * Delete testimonial (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete testimonial' })
  @ApiResponse({
    status: 200,
    description: 'Testimonial deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimonial not found',
  })
  @ApiParam({ name: 'id', type: String })
  softDelete(@Param('id') id: string) {
    return this.testimonialsService.softDelete(id);
  }
}
