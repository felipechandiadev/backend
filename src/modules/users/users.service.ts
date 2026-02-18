import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserStatus,
  UserRole,
  Permission,
} from '../../entities/user.entity';
import { Person } from '../../entities/person.entity';
import { Property } from '../../entities/property.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  ListAdminUsersQueryDto,
} from './dto/user.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { GridCommunityUsersQueryDto } from './dto/grid-community-users.dto';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';
import { UserFavoriteData } from '../../common/interfaces/user-favorites.interface';
import * as fs from 'fs';
import * as path from 'path';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'El nombre de usuario o correo ya está registrado.',
      );
    }

    // Use transaction to ensure both user and person are created together
    const queryRunner =
      this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Clean up personalInfo: remove undefined values, convert to null for avatarUrl
      const personalInfo = createUserDto.personalInfo 
        ? {
            firstName: createUserDto.personalInfo.firstName,
            lastName: createUserDto.personalInfo.lastName,
            phone: createUserDto.personalInfo.phone,
            avatarUrl: createUserDto.personalInfo.avatarUrl === undefined ? null : createUserDto.personalInfo.avatarUrl,
          }
        : {};

      // Create user
      const user = this.userRepository.create({
        ...createUserDto,
        status: UserStatus.ACTIVE,
        role: createUserDto.role || UserRole.COMMUNITY,
        permissions: createUserDto.permissions || [],
        personalInfo: personalInfo as any,
      });

      // Hash password using the entity method
      await user.setPassword(createUserDto.password);

      // Save user first to get the ID
      const savedUser = await queryRunner.manager.save(User, user);

      // Create associated person with blank data
      const person = this.personRepository.create({
        verified: false,
        user: savedUser, // Link the person to the user
      } as any);

      await queryRunner.manager.save(Person, person);

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedUser;
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findAdminUsers(filters: ListAdminUsersQueryDto): Promise<User[]> {
    const { search, status } = filters;

    const query = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.ADMIN })
      .andWhere('user.deletedAt IS NULL')
      .orderBy('user.createdAt', 'DESC');

    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      query.andWhere(
        `(
          LOWER(user.username) LIKE :search
          OR LOWER(user.email) LIKE :search
          OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.firstName'))) LIKE :search
          OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.lastName'))) LIKE :search
          OR LOWER(TRIM(CONCAT(
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.firstName')), ''),
            ' ',
            COALESCE(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.lastName')), '')
          ))) LIKE :search
        )`,
        { search: normalizedSearch },
      );
    }

    const admins = await query.getMany();

    admins.forEach((admin) => {
      delete (admin as any).password;
    });

    return admins;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if username or email is being updated and already exists
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser) {
        throw new ConflictException('El nombre de usuario ya está registrado.');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('El correo ya está registrado.');
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async softDelete(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softDelete(id);
  }

  async login(loginDto: LoginDto): Promise<User> {
    console.log('Login attempt for email:', loginDto.email);
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email, deletedAt: IsNull() },
    });

    console.log('User found:', !!user);
    if (user) {
      console.log('User status:', user.status);
      console.log('Stored password hash:', user.password);
      console.log('Provided password:', loginDto.password);
      const isPasswordValid = await user.validatePassword(loginDto.password);
      console.log('Password valid:', isPasswordValid);
    }

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isPasswordValid = await user.validatePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario inactivo.');
    }

    return user;
  }

  async assignRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findOne(id);
    const oldRole = user.role;
    user.role = role;
    const updatedUser = await this.userRepository.save(user);

    // Audit logging
    await this.auditService.createAuditLog({
      userId: id,
      action: AuditAction.ROLE_CHANGED,
      entityType: AuditEntityType.USER,
      entityId: id,
      description: `Rol del usuario cambiado de ${oldRole} a ${role}`,
      oldValues: { role: oldRole },
      newValues: { role },
      success: true,
    });

    return updatedUser;
  }

  async setPermissions(id: string, permissions: Permission[]): Promise<User> {
    const user = await this.findOne(id);
    const oldPermissions = user.permissions;
    user.permissions = permissions;
    const updatedUser = await this.userRepository.save(user);

    // Audit logging
    await this.auditService.createAuditLog({
      userId: id,
      action: AuditAction.PERMISSIONS_CHANGED,
      entityType: AuditEntityType.USER,
      entityId: id,
      description: `Permisos del usuario actualizados`,
      oldValues: { permissions: oldPermissions },
      newValues: { permissions },
      success: true,
    });

    return updatedUser;
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );
    await this.userRepository.update(id, { password: hashedNewPassword });

    // Audit log
    await this.auditService.createAuditLog({
      userId: id,
      action: AuditAction.PASSWORD_CHANGED,
      entityType: AuditEntityType.USER,
      entityId: id,
      description: `Contraseña cambiada para el usuario ${user.email}`,
      success: true,
    });
  }

  async setStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const oldStatus = user.status;
    user.status = status;
    const updatedUser = await this.userRepository.save(user);

    // Audit logging
    await this.auditService.createAuditLog({
      userId: id,
      action: AuditAction.STATUS_CHANGED,
      entityType: AuditEntityType.USER,
      entityId: id,
      description: `Estado del usuario cambiado de ${oldStatus} a ${status}`,
      oldValues: { status: oldStatus },
      newValues: { status },
      success: true,
    });

    return updatedUser;
  }

  async getProfile(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['person'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Audit logging
    await this.auditService.createAuditLog({
      userId: id,
      action: AuditAction.PROFILE_VIEWED,
      entityType: AuditEntityType.USER,
      entityId: id,
      description: `Perfil del usuario ${user.email} visualizado`,
      success: true,
    });

    return user;
  }

  async listAdminsAgents(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { search, page = 1, limit = 10 } = params;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.role IN (:...roles)', { roles: [UserRole.ADMIN, UserRole.AGENT] })
      .orderBy('user.personalInfo->>"$.firstName"', 'ASC');

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      queryBuilder.andWhere(
        `(
          LOWER(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.firstName'))) LIKE :search
          OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.lastName'))) LIKE :search
          OR LOWER(user.username) LIKE :search
          OR LOWER(user.email) LIKE :search
        )`,
        { search: normalizedSearch }
      );
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Remove password from results
    data.forEach((user) => {
      delete (user as any).password;
    });

    return { data, total, page, limit };
  }

  async listAgents(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const { search, page = 1, limit = 10 } = params;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('user.role = :role', { role: UserRole.AGENT })
      .orderBy('user.personalInfo->>"$.firstName"', 'ASC');

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      queryBuilder.andWhere(
        `(
          LOWER(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.firstName'))) LIKE :search
          OR LOWER(JSON_UNQUOTE(JSON_EXTRACT(user.personalInfo, '$.lastName'))) LIKE :search
          OR LOWER(user.username) LIKE :search
          OR LOWER(user.email) LIKE :search
        )`,
        { search: normalizedSearch }
      );
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Remove password from results
    data.forEach((user) => {
      delete (user as any).password;
    });

    return { data, total, page, limit };
  }

  /**
   * Lista las propiedades favoritas de un usuario
   */
  async getUserFavorites(userId: string): Promise<UserFavoriteData[]> {
    const user = await this.findOne(userId);
    return user.favoriteProperties || [];
  }

  /**
   * Verifica si una propiedad es favorita para cualquier usuario y devuelve detalles
   */
  async checkPropertyFavorite(propertyId: string): Promise<{
    isFavorite: boolean;
    favorites: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      favoriteData: UserFavoriteData;
    }>;
  }> {
    // Buscar todos los usuarios que tienen esta propiedad como favorita
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL')
      .andWhere('JSON_CONTAINS(user.favoriteProperties, :propertyId, "$.propertyId")', {
        propertyId: JSON.stringify(propertyId)
      })
      .getMany();

    const favorites = users.map(user => {
      // Encontrar el favorito específico para esta propiedad
      const favoriteData = user.favoriteProperties?.find(
        fav => fav.propertyId === propertyId
      );

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        favoriteData: favoriteData!
      };
    });

    return {
      isFavorite: favorites.length > 0,
      favorites
    };
  }

  async updateUserAvatar(id: string, file: Express.Multer.File): Promise<User> {
    console.log('Updating avatar for user:', id);
    console.log('File received:', { originalname: file.originalname, mimetype: file.mimetype, size: file.size, buffer: !!file.buffer });

    const user = await this.userRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!user) throw new NotFoundException('User not found');

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files (jpeg, png, webp) are allowed');
    }

    // Crear directorio absoluto (sin subcarpetas por usuario)
    const uploadDir = path.join(process.cwd(), 'public', 'users');
    console.log('Upload directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created upload directory');
    }

    // Generar filename con ID del usuario y path
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `avatar-${id}${ext}`;
    const filePath = path.join(uploadDir, filename);
    
    // Generar URL absoluta completa usando BACKEND_PUBLIC_URL
    const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3000';
    const absoluteUrl = `${backendUrl}/public/users/${filename}`;

    console.log('Saving file to:', filePath);
    console.log('Absolute URL will be:', absoluteUrl);

    // Mover archivo
    fs.writeFileSync(filePath, file.buffer);
    console.log('File saved successfully');

    // Actualizar usuario con URL absoluta
    if (!user.personalInfo) user.personalInfo = {};
    user.personalInfo.avatarUrl = absoluteUrl;
    await this.userRepository.save(user);
    return user;
  }

  async getUserProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ['person', 'person.dniCardFront', 'person.dniCardRear'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Las URLs ya están guardadas como absolutas en la base de datos
    const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL') || 'http://localhost:3000';

    const profile: UserProfileResponseDto = {
      id: user.id,
      username: user.username,
      email: user.email,
      personalInfo: {
        ...user.personalInfo,
        // Las URLs del avatar ya son absolutas, no necesitamos reconstruirlas
        avatarUrl: user.personalInfo?.avatarUrl,
      },
      person: user.person ? {
        id: user.person.id,
        dni: user.person.dni,
        address: user.person.address,
        phone: user.person.phone,
        email: user.person.email,
        verified: user.person.verified,
        dniCardFrontUrl: user.person.dniCardFront?.url || undefined,
        dniCardRearUrl: user.person.dniCardRear?.url || undefined,
      } : undefined,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return plainToInstance(UserProfileResponseDto, profile, { excludeExtraneousValues: true });
  }

  /**
   * Create a new COMMUNITY user from portal registration
   * User is created with email verification required
   */
  async createCommunityUser(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(
        'Este correo electrónico ya está registrado',
      );
    }

    // Generate email verification token (random string)
    const emailVerificationToken = Math.random()
      .toString(36)
      .substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Token expires in 24 hours
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    // Use transaction to ensure both user and person are created together
    const queryRunner =
      this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create user with email not verified
      const user = this.userRepository.create({
        username: email, // Use email as username for community users
        email,
        role: UserRole.COMMUNITY,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
        personalInfo: {
          firstName,
          lastName,
        } as any,
      });

      // Hash password
      await user.setPassword(password);

      // Save user
      const savedUser = await queryRunner.manager.save(User, user);

      // Create associated person
      const person = this.personRepository.create({
        verified: false,
        user: savedUser,
      } as any);

      await queryRunner.manager.save(Person, person);

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verify user email using token
   * Returns user if successful
   */
  async verifyUserEmail(token: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        emailVerificationToken: token,
        emailVerified: false,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Token de verificación inválido o ya fue utilizado',
      );
    }

    // Check if token has expired
    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException(
        'El token de verificación ha expirado. Solicita uno nuevo.',
      );
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    return await this.userRepository.save(user);
  }

  /**
   * Resend verification email for a community user
   * Generates a new token
   */
  async resendVerificationEmail(email: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestException(
        'El correo de este usuario ya está verificado',
      );
    }

    // Generate new token
    const emailVerificationToken = Math.random()
      .toString(36)
      .substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;

    await this.userRepository.save(user);

    return {
      token: emailVerificationToken,
      expiresAt: emailVerificationExpires,
    };
  }

  /**
   * Get paginated grid of community users with search, filtering, and sorting
   * Follows the same pattern as propertyService.gridSaleProperties
   */
  async gridCommunityUsers(query: any) {
    // Allowed fields and mappings
    const availableFields = [
      'id',
      'username',
      'email',
      'firstName',
      'lastName',
      'status',
      'createdAt',
      'updatedAt',
    ];

    const textSearchFields = [
      'LOWER(u.username)',
      'LOWER(u.email)',
      'LOWER(JSON_UNQUOTE(JSON_EXTRACT(u.personalInfo, "$.firstName")))',
      'LOWER(JSON_UNQUOTE(JSON_EXTRACT(u.personalInfo, "$.lastName")))',
    ];

    // Parse fields
    const requested = (query.fields || '')
      .split(',')
      .map((f: string) => f.trim())
      .filter((f: string) => f);
    const fields = requested.length
      ? requested.filter((f: string) => availableFields.includes(f))
      : availableFields;

    if (fields.length === 0) {
      if (query.pagination === 'true') {
        return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      }
      return [];
    }

    // Build query - select only needed fields from user table
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('u.deletedAt IS NULL')
      .andWhere('u.role = :role', { role: UserRole.COMMUNITY });

    // Global text search
    if (query.search) {
      const searchParam = `%${query.search.toLowerCase()}%`;
      const searchConditions = textSearchFields.map((field) => `${field} LIKE :search`).join(' OR ');
      qb.andWhere(`(${searchConditions})`, { search: searchParam });
    }

    // Column-based filters
    const filtration = query.filtration === 'true';
    if (filtration && query.filters) {
      const items = query.filters
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f.includes('-'))
        .map((f: string) => {
          const dash = f.indexOf('-');
          return {
            column: f.substring(0, dash).trim(),
            value: decodeURIComponent(f.substring(dash + 1).trim()),
          };
        })
        .filter((f: any) => f.column && f.value && availableFields.includes(f.column));

      for (const f of items) {
        if (f.column === 'firstName' || f.column === 'lastName') {
          const param = `%${f.value.toLowerCase()}%`;
          const jsonPath = f.column === 'firstName' ? '$.firstName' : '$.lastName';
          qb.andWhere(
            `LOWER(JSON_UNQUOTE(JSON_EXTRACT(u.personalInfo, '${jsonPath}'))) LIKE :f_${f.column}`,
            { [`f_${f.column}`]: param }
          );
        } else if (f.column === 'id' || f.column === 'username' || f.column === 'email' || f.column === 'status') {
          const param = `%${f.value.toLowerCase()}%`;
          qb.andWhere(`LOWER(u.${f.column}) LIKE :f_${f.column}`, {
            [`f_${f.column}`]: param,
          });
        }
      }
    }

    // Sorting
    const sortField = query.sortField || 'createdAt';
    const sortOrder = query.sort === 'desc' ? 'DESC' : 'ASC';

    if (sortField === 'firstName' || sortField === 'lastName') {
      const jsonPath = sortField === 'firstName' ? '$.firstName' : '$.lastName';
      qb.orderBy(
        `JSON_UNQUOTE(JSON_EXTRACT(u.personalInfo, '${jsonPath}'))`,
        sortOrder as 'ASC' | 'DESC'
      );
    } else if (availableFields.includes(sortField)) {
      qb.orderBy(`u.${sortField}`, sortOrder as 'ASC' | 'DESC');
    } else {
      qb.orderBy('u.createdAt', 'DESC');
    }

    // Get total count before pagination
    const total = await qb.getCount();

    // Pagination
    const usePagination = query.pagination === 'true';
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;

    if (usePagination) {
      qb.skip((page - 1) * limit).take(limit);
    }

    // Execute query and get full user objects
    const users = await qb.getMany();

    // Map to grid row format with only requested fields
    const mappedRows = users.map((user: User) => {
      const row: any = {};
      
      for (const field of fields) {
        if (field === 'id') {
          row.id = user.id;
        } else if (field === 'username') {
          row.username = user.username;
        } else if (field === 'email') {
          row.email = user.email;
        } else if (field === 'status') {
          row.status = user.status;
        } else if (field === 'createdAt') {
          row.createdAt = user.createdAt;
        } else if (field === 'updatedAt') {
          row.updatedAt = user.updatedAt;
        } else if (field === 'firstName') {
          row.firstName = user.personalInfo?.firstName || '';
        } else if (field === 'lastName') {
          row.lastName = user.personalInfo?.lastName || '';
        }
      }
      
      return row;
    });

    // Return response
    if (usePagination) {
      const totalPages = Math.ceil(total / limit);
      return {
        data: mappedRows,
        total,
        page,
        limit,
        totalPages,
      };
    }

    return mappedRows;
  }

  /**
   * Lista las propiedades favoritas de un usuario con todos sus detalles para el portal
   */
  async getUserFavoriteProperties(userId: string): Promise<Property[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.favoriteProperties || user.favoriteProperties.length === 0) {
      return [];
    }

    const propertyIds = user.favoriteProperties.map(fav => fav.propertyId);

    // Buscar las propiedades y añadir relaciones necesarias para el card del portal
    const properties = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.propertyType', 'pt')
      .leftJoinAndSelect('property.multimedia', 'multimedia')
      .where('property.id IN (:...propertyIds)', { propertyIds })
      .andWhere('property.deletedAt IS NULL')
      .getMany();

    // Normalizar URLs de imágenes (lógica similar a PropertyService)
    for (const property of properties) {
      if (property.mainImageUrl) {
        property.mainImageUrl = this.normalizeUrl(property.mainImageUrl);
      } else {
        // Buscar primera imagen en multimedia si no hay mainImageUrl
        const img = property.multimedia?.find(m => m.type === 'PROPERTY_IMG' || m.format === 'IMG');
        if (img) {
          property.mainImageUrl = this.normalizeUrl(img.url);
        }
      }
    }

    return properties;
  }

  private normalizeUrl(url?: string): string | undefined {
    if (!url) return url;

    const publicBaseUrl = (
      this.configService.get<string>('BACKEND_PUBLIC_URL') ||
      process.env.BACKEND_PUBLIC_URL ||
      ''
    ).replace(/\/$/, '');

    let res = url;

    // Si ya tiene /img/ o /video/ no hacer nada
    if (!url.includes('/properties/img/') && !url.includes('/properties/video/')) {
      // Si está en /public/properties/ y no tiene subcarpeta, agregar /img/ por defecto
      if (url.includes('/public/properties/')) {
        res = url.replace('/public/properties/', '/public/properties/img/');
      }
    }

    // Asegurar que sea una URL completa si tenemos publicBaseUrl y es una ruta relativa
    if (res.startsWith('/') && publicBaseUrl) {
      return `${publicBaseUrl}${res}`;
    }

    return res;
  }
}
