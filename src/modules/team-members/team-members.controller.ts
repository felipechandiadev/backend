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
import { TeamMembersService } from './team-members.service';
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/team-member.dto';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';
import { MultimediaService } from '../multimedia/services/multimedia.service';
import { StaticFilesService } from '../multimedia/services/static-files.service';

@Controller('team-members')
@ApiTags('Team Members')
export class TeamMembersController {
  constructor(
    private readonly teamMembersService: TeamMembersService,
    private readonly multimediaService: MultimediaService,
    private readonly staticFilesService: StaticFilesService,
  ) {}

  /**
   * Create a new team member with optional photo
   */
  @Post()
  @ApiOperation({ summary: 'Create new team member' })
  @ApiResponse({
    status: 201,
    description: 'Team member created successfully',
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
        name: { type: 'string' },
        role: { type: 'string' },
        bio: { type: 'string' },
        email: { type: 'string' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo'))
  @Audit(AuditAction.CREATE, AuditEntityType.TEAM_MEMBER, 'Team member created')
  async create(
    @Body(ValidationPipe) createTeamMemberDto: CreateTeamMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
      createTeamMemberDto.multimediaUrl = await this.multimediaService.uploadFileToPath(
        file,
        'web/team-members',
      );
    }
    return this.teamMembersService.create(createTeamMemberDto);
  }

  /**
   * Get all team members with optional search
   */
  @Get()
  @ApiOperation({ summary: 'Get all team members' })
  @ApiResponse({
    status: 200,
    description: 'List of team members',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or role' })
  @Audit(AuditAction.READ, AuditEntityType.TEAM_MEMBER, 'Team members listed')
  findAll(@Query('search') search?: string) {
    return this.teamMembersService.findAll(search);
  }

  /**
   * Get team member by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get team member by ID' })
  @ApiResponse({
    status: 200,
    description: 'Team member details',
  })
  @ApiResponse({
    status: 404,
    description: 'Team member not found',
  })
  @ApiParam({ name: 'id', type: String })
  @Audit(AuditAction.READ, AuditEntityType.TEAM_MEMBER, 'Team member viewed')
  findOne(@Param('id') id: string) {
    return this.teamMembersService.findOne(id);
  }

  /**
   * Update team member with optional photo
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update team member' })
  @ApiResponse({
    status: 200,
    description: 'Team member updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team member not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        role: { type: 'string' },
        bio: { type: 'string' },
        email: { type: 'string' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo'))
  @Audit(AuditAction.UPDATE, AuditEntityType.TEAM_MEMBER, 'Team member updated')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateTeamMemberDto: UpdateTeamMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      // uploadFileToPath ya devuelve la URL correcta (R2 o local según configuración)
      updateTeamMemberDto.multimediaUrl = await this.multimediaService.uploadFileToPath(
        file,
        'web/team-members',
      );
    }
    return this.teamMembersService.update(id, updateTeamMemberDto);
  }

  /**
   * Delete team member (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete team member' })
  @ApiResponse({
    status: 200,
    description: 'Team member deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team member not found',
  })
  @ApiParam({ name: 'id', type: String })
  @Audit(AuditAction.DELETE, AuditEntityType.TEAM_MEMBER, 'Team member deleted')
  softDelete(@Param('id') id: string) {
    return this.teamMembersService.softDelete(id);
  }
}
