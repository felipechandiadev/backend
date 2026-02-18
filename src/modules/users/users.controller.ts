import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  HttpCode,
  UseGuards,
  Query,
  Put,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  AssignRoleDto,
  UpdatePermissionsDto,
  ListAdminUsersQueryDto,
} from './dto/user.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { GridCommunityUsersQueryDto } from './dto/grid-community-users.dto';
import { UserStatus, UserRole, Permission } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user account
   * Only available to authenticated admins/system
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid email or missing required fields',
  })
  @ApiBody({ type: CreateUserDto })
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, setPassword, validatePassword, ...userResponse } =
      user as any;
    return userResponse;
  }

  /**
   * Get all users (with optional filters)
   */
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
  })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * List admin users with search and pagination
   */
  @Get('admins')
  @ApiOperation({ summary: 'Get list of admin users' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of admin users',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listAdmins(@Query(ValidationPipe) filters: ListAdminUsersQueryDto) {
    return this.usersService.findAdminUsers(filters);
  }

  /**
   * Get current user's profile
   * Requires authentication
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile details',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any): Promise<UserProfileResponseDto> {
    const userId = req.user.id;
    return this.usersService.getUserProfile(userId);
  }

  /**
   * List admins and agents with search and pagination
   */
  @Get('admins-agents')
  @ApiOperation({ summary: 'Get list of admins and agents' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of admins and agents',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listAdminsAgents(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.listAdminsAgents({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * List agent users with search and pagination
   */
  @Get('agents')
  @ApiOperation({ summary: 'Get list of agent users' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of agent users',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listAgents(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.listAgents({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Get community users grid with pagination, search, and filtering
   * Follows the same pattern as properties grid
   */
  @Get('grid/community')
  @ApiOperation({ summary: 'Get community users grid with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated grid of community users',
  })
  @ApiQuery({ name: 'fields', required: false, description: 'Comma-separated fields to include' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: 'Sort direction' })
  @ApiQuery({ name: 'sortField', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'search', required: false, description: 'Global text search' })
  @ApiQuery({ name: 'filtration', required: false, description: 'Enable column filters (true/false)' })
  @ApiQuery({ name: 'filters', required: false, description: 'Column filters (e.g., "status-ACTIVE,email-test@example.com")' })
  @ApiQuery({ name: 'pagination', required: false, description: 'Enable pagination (true/false)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  gridCommunityUsers(@Query(ValidationPipe) query: GridCommunityUsersQueryDto) {
    return this.usersService.gridCommunityUsers(query);
  }

  /**
   * Get favorite properties with full details
   */
  @Get(':id/favorites/details')
  @ApiOperation({ summary: 'Get favorite properties with details' })
  @ApiResponse({
    status: 200,
    description: 'List of favorite properties with details',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getFavoriteProperties(@Param('id') id: string) {
    return this.usersService.getUserFavoriteProperties(id);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Get public profile of a user by ID
   */
  @Get(':id/profile')
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiResponse({
    status: 200,
    description: 'User profile details',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiParam({ name: 'id', type: String })
  getUserProfileById(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  /**
   * Update user details
   * Requires authentication
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateUserDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Update user status (ACTIVE, INACTIVE, SUSPENDED)
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user account status' })
  @ApiResponse({
    status: 200,
    description: 'Status updated',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      example: { status: 'ACTIVE' },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setStatus(
    @Param('id') id: string,
    @Body('status', ValidationPipe) status: UserStatus,
  ) {
    return this.usersService.setStatus(id, status);
  }

  /**
   * Assign role to user (USER, AGENT, ADMIN, SUPERADMIN)
   */
  @Patch(':id/role')
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({
    status: 200,
    description: 'Role assigned successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: AssignRoleDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  assignRole(
    @Param('id') id: string,
    @Body(ValidationPipe) assignRoleDto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(id, assignRoleDto.role);
  }

  /**
   * Update user permissions
   */
  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update user permissions' })
  @ApiResponse({
    status: 200,
    description: 'Permissions updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdatePermissionsDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setPermissions(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePermissionsDto: UpdatePermissionsDto,
  ) {
    return this.usersService.setPermissions(
      id,
      updatePermissionsDto.permissions,
    );
  }

  /**
   * Change user password
   */
  @Patch(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid current password',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: ChangePasswordDto })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(id, changePasswordDto);
  }

  /**
   * Soft delete user (marks as deleted without removing from DB)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  softDelete(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }

  /**
   * Update user avatar/profile picture
   * Accepts multipart file upload
   */
  @Put(':id/avatar')
  @ApiOperation({ summary: 'Update user avatar' })
  @ApiResponse({
    status: 200,
    description: 'Avatar updated successfully',
    type: UpdateAvatarDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateUserAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateAvatarDto> {
    const user = await this.usersService.updateUserAvatar(id, file);
    return { avatarUrl: user.personalInfo?.avatarUrl };
  }
}
