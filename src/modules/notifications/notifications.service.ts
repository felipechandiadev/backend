import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationType,
  NotificationSenderType,
} from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Property } from '../../entities/property.entity';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './dto/notification.dto';
import { EmailService } from './email.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { NOTIFICATION_MAIL_CONFIG, shouldSendEmail } from './notification-mail.config';

export interface NotificationWithUserDetails extends Notification {
  targetUsers?: Array<{ id: string; name: string }>;
}

@Injectable()
export class NotificationsService {
  /**
   * Envía notificación de interés en propiedad a todos los administradores y al agente asignado
   */
  async notifyInterestOnProperty(
    propertyId: string,
    assignedAgentId?: string,
    interestedUserId?: string,
    interestedUserName?: string,
    interestedUserEmail?: string,
    interestedUserPhone?: string,
    interestedUserMessage?: string
  ): Promise<Notification[]> {
    console.log('🔄 notifyInterestOnProperty called with:', {
      propertyId,
      assignedAgentId,
      interestedUserId,
      interestedUserName,
      interestedUserEmail,
      interestedUserPhone,
      interestedUserMessage,
    });

    // Obtener todos los administradores
    const admins = await this.getAdminUserIds();
    console.log('👥 Found admins:', admins);

    // Construir lista de destinatarios
    const targetUserIds = [...admins];
    if (assignedAgentId) {
      targetUserIds.push(assignedAgentId);
    }
    console.log('📧 Target user IDs:', targetUserIds);

    // Datos del sender
    const senderType = interestedUserId ? NotificationSenderType.USER : NotificationSenderType.ANONYMOUS;
    const senderId = interestedUserId || undefined;
    const senderName = interestedUserId ? await this.getUserName(interestedUserId) : (interestedUserName || 'Anónimo');

    // Obtener información de la propiedad para incluir el código
    let propertyInfo = propertyId;
    try {
      const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
      if (property) {
        // Usar el código de la propiedad y el título
        propertyInfo = property.title ? `${property.title} (Código: ${property.code || property.id.substring(0, 8)})` : (property.code || property.id);
      }
    } catch (error) {
      console.error('Error fetching property info for notification:', error);
    }

    // Construir mensaje completo incluyendo la referencia de la propiedad
    const interestHeader = `Interés en propiedad: ${propertyInfo}`;
    const userContact = `${interestedUserName || 'Usuario'} (${interestedUserEmail || 'Sin email'}, ${interestedUserPhone || 'Sin teléfono'})`;
    
    const fullMessage = `${interestHeader}\n\nDe: ${userContact}\n\nMensaje: ${interestedUserMessage || 'Sin mensaje adicional.'}`;

    console.log('📝 Full message:', fullMessage);

    // Crear notificación para cada destinatario
    const notifications: Notification[] = [];
    for (const userId of targetUserIds) {
      console.log(`📤 Creating notification for user: ${userId}`);

      const dto: CreateNotificationDto = {
        senderType,
        senderId,
        senderName,
        isSystem: false,
        message: fullMessage,
        targetUserIds: [userId],
        type: NotificationType.INTEREST,
        // Agregar información adicional para correos
        targetMails: interestedUserEmail ? [interestedUserEmail] : undefined,
        interestedUserEmail,
        interestedUserName,
        interestedUserPhone,
        interestedUserMessage,
      };

      console.log(`📧 DTO being created:`, {
        interestedUserEmail: dto.interestedUserEmail,
        interestedUserName: dto.interestedUserName,
        interestedUserPhone: dto.interestedUserPhone,
        interestedUserMessage: dto.interestedUserMessage,
      });

      const notification = await this.create(dto);
      notifications.push(notification);
      console.log(`✅ Notification created: ${notification.id}`);
    }

    console.log(`🎯 Total notifications created: ${notifications.length}`);
    return notifications;
  }

  /**
   * Envía notificación de contacto general a todos los administradores
   */
  async notifyContactToAdmins(
    contactName: string,
    contactEmail: string,
    contactPhone: string,
    contactMessage: string
  ): Promise<Notification[]> {
    console.log('🔄 notifyContactToAdmins called with:', {
      contactName,
      contactEmail,
      contactPhone,
      contactMessage,
    });

    // Obtener todos los administradores
    const admins = await this.getAdminUserIds();
    console.log('👥 Found admins:', admins);

    // Construir mensaje completo
    const fullMessage = `${contactName} (${contactEmail}) ${contactPhone}: ${contactMessage}`;

    console.log('📝 Full message:', fullMessage);

    // Crear notificación para cada administrador
    const notifications: Notification[] = [];
    for (const userId of admins) {
      console.log(`📤 Creating notification for admin: ${userId}`);

      const dto: CreateNotificationDto = {
        senderType: NotificationSenderType.ANONYMOUS,
        senderId: undefined,
        senderName: contactName,
        isSystem: false,
        message: fullMessage,
        targetUserIds: [userId],
        type: NotificationType.CONTACT,
        // Agregar información adicional para correos
        targetMails: [contactEmail],
        interestedUserEmail: contactEmail,
        interestedUserName: contactName,
        interestedUserPhone: contactPhone,
        interestedUserMessage: contactMessage,
      };

      console.log(`📧 DTO being created:`, {
        interestedUserEmail: dto.interestedUserEmail,
        interestedUserName: dto.interestedUserName,
        interestedUserPhone: dto.interestedUserPhone,
        interestedUserMessage: dto.interestedUserMessage,
      });

      const notification = await this.create(dto);
      notifications.push(notification);
      console.log(`✅ Notification created: ${notification.id}`);
    }

    console.log(`🎯 Total notifications created: ${notifications.length}`);
    return notifications;
  }

  /**
   * Envía notificación de solicitud de publicación a todos los administradores
   */
  async notifyPropertyPublicationRequestToAdmins(
    userName: string,
    userEmail: string,
    propertyTitle: string,
    propertyType: string,
    propertyOperation: string,
    userPhone?: string
  ): Promise<Notification[]> {
    console.log('🔄 notifyPropertyPublicationRequestToAdmins called for:', {
      userName,
      userEmail,
      propertyTitle,
      userPhone,
    });

    // Obtener todos los administradores
    const admins = await this.getAdminUserIds();
    console.log('👥 Found admins:', admins);

    const fullMessage = `Nueva solicitud de publicación: ${userName} (${userEmail}) ha solicitado publicar la propiedad "${propertyTitle}" (${propertyType} en ${propertyOperation}).`;

    const notifications: Notification[] = [];
    for (const userId of admins) {
      const dto: CreateNotificationDto = {
        senderType: NotificationSenderType.USER,
        senderId: undefined, // Si quisiéramos el ID del usuario que solicita, habría que pasarlo
        senderName: userName,
        isSystem: true,
        message: fullMessage,
        targetUserIds: [userId],
        type: NotificationType.PROPERTY_PUBLICATION_REQUEST,
        targetMails: [userEmail],
        interestedUserEmail: userEmail,
        interestedUserName: userName,
        interestedUserPhone: userPhone,
        interestedUserMessage: `Solicitud de publicación para: ${propertyTitle}`,
      };

      const notification = await this.create(dto);
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Obtiene los IDs de todos los usuarios administradores
   */
  private async getAdminUserIds(): Promise<string[]> {
    try {
      const admins = await this.usersService.findAdminUsers({});
      console.log('👥 Raw admins from service:', admins);
      const adminIds = admins.map((admin) => admin.id);
      console.log('🆔 Admin IDs extracted:', adminIds);
      return adminIds;
    } catch (error) {
      console.error('❌ Error getting admin user IDs:', error);
      return [];
    }
  }
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notificationData = {
      ...createNotificationDto,
      status: createNotificationDto.status ?? NotificationStatus.SEND,
      firstViewerId: createNotificationDto.firstViewerId ?? null,
      firstViewedAt: createNotificationDto.firstViewedAt ?? null,
    };

    const savedNotification = await this.notificationRepository.save(notificationData);

    // Enviar correos si corresponde (ASÍNCRONO - no bloquea la respuesta)
    this.sendNotificationEmails(savedNotification, createNotificationDto).catch(error => {
      console.error('❌ ERROR ENVIANDO CORREOS DE NOTIFICACIÓN:', error);
      console.error('Stack trace:', error.stack);
    });

    // Send emails if targetMails are specified (legacy support)
    if (createNotificationDto.targetMails && createNotificationDto.targetMails.length > 0) {
      try {
        const emailPromises = createNotificationDto.targetMails.map(email =>
          this.emailService.sendMail({
            to: email,
            subject: `Nueva notificación: ${createNotificationDto.type}`,
            text: createNotificationDto.message || `Has recibido una nueva notificación del tipo: ${createNotificationDto.type}`,
            templateVariables: {
              notificationType: createNotificationDto.type,
              notificationId: savedNotification.id,
            },
          })
        );
        await Promise.all(emailPromises);
      } catch (error) {
        // Log email sending error but don't fail the notification creation
        console.error('Error sending notification emails:', error);
      }
    }

    return savedNotification;
  }

  // Helper para obtener nombre de usuario
  private async getUserName(userId: string): Promise<string> {
    try {
      const user = await this.usersService.findOne(userId);
      return user?.name || user?.email || 'Usuario';
    } catch {
      return 'Usuario';
    }
  }

  async findAll(page: number = 1, limit: number = 20): Promise<{ data: Notification[], total: number }> {
    const [data, total] = await this.notificationRepository.findAndCount({
      where: { deletedAt: IsNull() },
      relations: ['multimedia', 'viewer'],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['multimedia', 'viewer'],
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notification;
  }

  async getNotificationById(id: string): Promise<NotificationWithUserDetails> {
    const notification = await this.findOne(id);

    // Obtener nombres de usuarios destinatarios
    const targetUsers: Array<{ id: string; name: string }> = [];
    if (notification.targetUserIds && notification.targetUserIds.length > 0) {
      for (const userId of notification.targetUserIds) {
        try {
          const user = await this.usersService.findOne(userId);
          targetUsers.push({
            id: userId,
            name: user?.name || user?.email || `Usuario ${userId}`,
          });
        } catch {
          // Usuario no encontrado o eliminado
          targetUsers.push({
            id: userId,
            name: `Usuario desconocido (${userId})`,
          });
        }
      }
    }

    return {
      ...notification,
      targetUsers,
    };
  }

  async update(
    id: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    Object.assign(notification, updateNotificationDto);
    return await this.notificationRepository.save(notification);
  }

  async softDelete(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.softDelete(id);
  }

  async markAsOpened(id: string, viewerId: string): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.status === NotificationStatus.OPEN) {
      throw new BadRequestException('La notificación ya ha sido abierta');
    }

    notification.status = NotificationStatus.OPEN;
    notification.viewer = { id: viewerId } as User;

    return await this.notificationRepository.save(notification);
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return await this.notificationRepository
      .createQueryBuilder('notification')
      .where(`JSON_CONTAINS(notification.targetUserIds, JSON_ARRAY(:userId))`, {
        userId,
      })
      .andWhere('notification.deletedAt IS NULL')
      .leftJoinAndSelect('notification.multimedia', 'multimedia')
      .leftJoinAndSelect('notification.viewer', 'viewer')
      .orderBy('notification.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Cuenta las notificaciones no leídas (status SEND) para un usuario
   */
  async countUnread(userId: string): Promise<number> {
    return await this.notificationRepository
      .createQueryBuilder('notification')
      .where(`JSON_CONTAINS(notification.targetUserIds, JSON_ARRAY(:userId))`, {
        userId,
      })
      .andWhere('notification.status = :status', { status: NotificationStatus.SEND })
      .andWhere('notification.deletedAt IS NULL')
      .getCount();
  }

  /**
   * Marca todas las notificaciones no leídas (status SEND) para un usuario como leídas (status OPEN)
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ status: NotificationStatus.OPEN })
      .where(`JSON_CONTAINS(targetUserIds, JSON_ARRAY(:userId))`, { userId })
      .andWhere('status = :currentStatus', { currentStatus: NotificationStatus.SEND })
      .andWhere('deletedAt IS NULL')
      .execute();

    return result.affected || 0;
  }

  /**
   * Actualiza el status de una notificación específica
   */
  async updateStatus(id: string, status: NotificationStatus): Promise<Notification> {
    const notification = await this.findOne(id);
    notification.status = status;
    return await this.notificationRepository.save(notification);
  }

  /**
   * Get user notifications grid with filtering, sorting, and pagination
   */
  async userGridNotifications(
    userId: string,
    options: {
      fields?: string;
      sort?: 'asc' | 'desc';
      sortField?: string;
      search?: string;
      filtration?: boolean;
      filters?: string;
      pagination?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number; totalPages: number }> {
    const {
      fields,
      sort = 'desc',
      sortField = 'createdAt',
      search,
      filtration = false,
      filters,
      pagination = true,
      page = 1,
      limit = 25,
    } = options;

    let queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where(`JSON_CONTAINS(notification.targetUserIds, JSON_ARRAY(:userId))`, { userId })
      .andWhere('notification.deletedAt IS NULL');

    // Apply search filter
    if (search && search.trim()) {
      queryBuilder = queryBuilder.andWhere(
        '(notification.message LIKE :search OR notification.senderName LIKE :search)',
        { search: `%${search.trim()}%` }
      );
    }

    // Apply additional filters
    if (filtration && filters) {
      const filterPairs = filters.split(',');
      for (const filterPair of filterPairs) {
        const [field, value] = filterPair.split('-');
        if (field && value) {
          switch (field) {
            case 'type':
              queryBuilder = queryBuilder.andWhere('notification.type = :type', { type: value });
              break;
            case 'status':
              queryBuilder = queryBuilder.andWhere('notification.status = :status', { status: value });
              break;
            case 'senderType':
              queryBuilder = queryBuilder.andWhere('notification.senderType = :senderType', { senderType: value });
              break;
            case 'isSystem':
              queryBuilder = queryBuilder.andWhere('notification.isSystem = :isSystem', { isSystem: value === 'true' });
              break;
            case 'interestedUserName':
              queryBuilder = queryBuilder.andWhere('notification.interestedUserName LIKE :interestedUserName', { interestedUserName: `%${value}%` });
              break;
            case 'interestedUserEmail':
              queryBuilder = queryBuilder.andWhere('notification.interestedUserEmail LIKE :interestedUserEmail', { interestedUserEmail: `%${value}%` });
              break;
            case 'interestedUserPhone':
              queryBuilder = queryBuilder.andWhere('notification.interestedUserPhone LIKE :interestedUserPhone', { interestedUserPhone: `%${value}%` });
              break;
          }
        }
      }
    }

    // Apply sorting
    const validSortFields = ['createdAt', 'updatedAt', 'type', 'status', 'senderName', 'senderType', 'interestedUserName', 'interestedUserEmail', 'interestedUserPhone'];
    const sortBy = validSortFields.includes(sortField) ? sortField : 'createdAt';
    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';
    queryBuilder = queryBuilder.orderBy(`notification.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    if (pagination) {
      queryBuilder = queryBuilder.skip((page - 1) * limit).take(limit);
    }

    // Select specific fields if requested
    if (fields) {
      const fieldList = fields.split(',').map(f => f.trim());
      const selectFields = fieldList.map(field => `notification.${field}`);
      queryBuilder = queryBuilder.select(selectFields);
    }

    // Execute query
    const data = await queryBuilder.getMany();

    const totalPages = pagination ? Math.ceil(total / limit) : 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Export user notifications grid to Excel (UNPAGINATED). Reuses userGridNotifications query semantics.
   */
  async exportUserGridNotificationsExcel(
    userId: string,
    options: {
      fields?: string;
      sort?: 'asc' | 'desc';
      sortField?: string;
      search?: string;
      filtration?: boolean;
      filters?: string;
    } = {}
  ): Promise<Buffer> {
    // Define the default columns (keep same order as frontend DataGrid)
    const columns = [
      { key: 'message', header: 'Mensaje' },
      { key: 'type', header: 'Tipo' },
      { key: 'status', header: 'Estado' },
      { key: 'interestedUserName', header: 'Contacto' },
      { key: 'interestedUserEmail', header: 'Email contacto' },
      { key: 'interestedUserPhone', header: 'Teléfono contacto' },
      { key: 'senderType', header: 'Tipo Remitente' },
      { key: 'createdAt', header: 'Fecha' },
    ];

    // Force fields to ensure grid returns the columns we need
    const fields = options.fields ?? columns.map(c => c.key).join(',');
    const gridResult = await this.userGridNotifications(userId, { ...options, fields, pagination: false });
    const rows = Array.isArray(gridResult) ? gridResult : gridResult.data;

    // Build Excel workbook
    const workbook = new (await import('exceljs')).Workbook();
    const sheet = workbook.addWorksheet('Notificaciones');

    sheet.columns = columns.map(col => ({ key: col.key, header: col.header, width: 30 }));

    rows.forEach((row: any) => {
      const excelRow: Record<string, any> = {};
      columns.forEach(col => {
        excelRow[col.key] = row[col.key] ?? '';
      });
      sheet.addRow(excelRow);
    });

    // Style: thin borders
    sheet.eachRow({ includeEmpty: true }, (r) => {
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Property-related notification methods
  async notifyPropertyStatusChange(
    property: Property,
    oldStatus: PropertyStatus,
    newStatus: PropertyStatus,
  ): Promise<Notification> {
    console.log(`🔔 notifyPropertyStatusChange: Propiedad "${property.title}" (${property.id})`);
    console.log(`🔔 Cambio de estado: ${oldStatus} -> ${newStatus}`);
    
    const targetUserIds: string[] = [];
    let creatorEmail: string | undefined;
    let creatorName: string | undefined;
    let creatorPhone: string | undefined;
    
    // Obtener creador de la propiedad
    const creatorId = property.creatorUserId || property.creatorUser?.id;
    console.log(`👤 Creator ID detectado: ${creatorId}`);

    if (creatorId) {
      targetUserIds.push(creatorId);
      try {
        const creator = await this.usersService.findOne(creatorId);
        if (creator) {
          creatorEmail = creator.email;
          creatorName = creator.name;
          // intentar obtener teléfono desde person o campo directo
          creatorPhone = (creator as any)?.phone || (creator as any)?.person?.phone || undefined;
          console.log(`📧 Creator email encontrado: ${creatorEmail}`);
          console.log(`📞 Creator phone resolved: ${creatorPhone}`);
        }
      } catch (error) {
        console.warn(`Could not find creator for notification: ${creatorId}`);
      }
    }
    
    // Si no hay email del creador pero hay un agente, avisar al agente
    const agentId = property.assignedAgentId || property.assignedAgent?.id;
    if (agentId) {
      targetUserIds.push(agentId);
      console.log(`👤 Agent ID detectado: ${agentId}`);
    }

    if (targetUserIds.length === 0) {
      console.warn('⚠️ No se encontraron destinatarios para la notificación de cambio de estado');
    }

    const statusMap = {
      [PropertyStatus.REQUEST]: 'Solicitada',
      [PropertyStatus.PRE_APPROVED]: 'Pre-Aprobada',
      [PropertyStatus.PUBLISHED]: 'Publicada',
      [PropertyStatus.INACTIVE]: 'Inactiva',
      [PropertyStatus.SOLD]: 'Vendida',
      [PropertyStatus.RENTED]: 'Arrendada',
      [PropertyStatus.CONTRACT_IN_PROGRESS]: 'Contrato en Progreso',
    };

    const newStatusLabel = statusMap[newStatus] || newStatus;
    const message = `El estado de tu propiedad "${property.title}" ha cambiado a "${newStatusLabel}".`;

    const createDto: CreateNotificationDto = {
      senderType: NotificationSenderType.SYSTEM,
      senderId: undefined,
      senderName: 'Sistema',
      isSystem: true,
      message,
      targetUserIds,
      type: NotificationType.PUBLICATION_STATUS_CHANGE,
      interestedUserEmail: creatorEmail,
      interestedUserName: creatorName,
      interestedUserPhone: creatorPhone,
      interestedUserMessage: `Nuevo estado: ${newStatusLabel}`
    };

    console.log('🚀 Creando notificación y enviando correos...');
    return await this.create(createDto);
  }

  async notifyAgentAssigned(property: Property, agent: User): Promise<Notification> {
    const createDto: CreateNotificationDto = {
      senderType: NotificationSenderType.SYSTEM,
      senderId: undefined,
      senderName: 'Sistema',
      isSystem: true,
      message: `Se te ha asignado la propiedad ${property.id}.`,
      targetUserIds: [agent.id],
      type: NotificationType.PROPERTY_AGENT_ASSIGNMENT,
    };

    return await this.create(createDto);
  }

  /**
   * Envía correos electrónicos basados en la configuración de la notificación
   * Este método se ejecuta de forma asíncrona para no bloquear la creación de notificaciones
   */
  private async sendNotificationEmails(
    notification: Notification,
    createDto: CreateNotificationDto
  ): Promise<void> {
    console.log(`📧 sendNotificationEmails called for notification: ${notification.id}, type: ${notification.type}`);
    console.log(`📧 Notification data:`, {
      interestedUserEmail: notification.interestedUserEmail,
      interestedUserName: notification.interestedUserName,
      interestedUserMessage: notification.interestedUserMessage,
      targetUserIds: notification.targetUserIds,
    });

    // Verificar si este tipo de notificación debe enviar correos
    if (!shouldSendEmail(notification.type)) {
      console.log(`❌ Email sending disabled for type: ${notification.type}`);
      return;
    }

    const mailConfig = NOTIFICATION_MAIL_CONFIG[notification.type];
    if (!mailConfig) {
      console.warn(`⚠️ No mail config found for notification type: ${notification.type}`);
      return;
    }

    console.log(`✅ Mail config found:`, mailConfig);

    try {
      // Extraer información del contexto de la notificación
      const context = await this.buildMailContext(notification, createDto);
      console.log(`📋 Mail context built:`, context);

      // Enviar correo al usuario interesado si corresponde
      if (mailConfig.sendToInterested && context.interestedUserEmail) {
        if (notification.type === NotificationType.PROPERTY_PUBLICATION_REQUEST) {
          console.log(`📤 Sending property request confirmation to: ${context.interestedUserEmail}`);
          await this.mailService.sendPropertyRequestUserConfirmation(
            context.interestedUserEmail,
            context.interestedUserName || 'Usuario',
            context.propertyTitle || 'Propiedad'
          );
        } else if (notification.type === NotificationType.PUBLICATION_STATUS_CHANGE) {
          console.log(`📤 Sending property status change notification to: ${context.interestedUserEmail}`);
          await this.mailService.sendPropertyStatusChangeNotification(
            context.interestedUserEmail,
            context.interestedUserName || 'Usuario',
            context.propertyTitle || 'Propiedad',
            context.interestedUserMessage?.split(': ')[1] || 'Actualizado'
          );
        } else {
          console.log(`📤 Sending interest confirmation to: ${context.interestedUserEmail}`);
          await this.mailService.sendInterestConfirmation(
            context.interestedUserEmail,
            context.interestedUserName || 'Usuario',
            context.propertyTitle || 'Propiedad',
            context.message,
            context.interestedUserPhone
          );
        }
        console.log(`✅ Confirmation sent to: ${context.interestedUserEmail}`);
      }

      // Enviar notificaciones a administradores si corresponde
      if (mailConfig.sendToAdmins && notification.targetUserIds) {
        const adminEmails = await this.getAdminEmails(notification.targetUserIds);
        console.log(`👥 Found admin emails:`, adminEmails);

        for (const adminEmail of adminEmails) {
          console.log(`📤 Sending admin notification to: ${adminEmail}`);
          const adminUser = await this.userRepository.findOne({
            where: { email: adminEmail, deletedAt: IsNull() }
          });
          if (adminUser) {
            if (notification.type === NotificationType.PROPERTY_PUBLICATION_REQUEST) {
              await this.mailService.sendPropertyRequestAdminNotification(
                adminEmail,
                adminUser.name || 'Administrador',
                context.interestedUserName || 'Usuario',
                context.interestedUserEmail || '',
                context.propertyTitle || 'Propiedad',
                context.propertyOperation || 'Solicitud'
              );
            } else {
              await this.mailService.sendAdminNotification(
                adminEmail,
                adminUser.name || 'Administrador',
                context.interestedUserName || 'Usuario',
                context.interestedUserEmail || '',
                context.interestedUserPhone || undefined,
                context.propertyTitle || 'Propiedad',
                context.message || ''
              );
            }
            console.log(`✅ Admin notification sent to: ${adminEmail}`);
          } else {
            console.log(`❌ Admin user not found for email: ${adminEmail}`);
          }
        }
      } else {
        console.log(`❌ Not sending to admins - config: ${mailConfig.sendToAdmins}, targetUserIds: ${notification.targetUserIds?.length || 0}`);
      }

      // Enviar notificación al agente asignado si corresponde
      if (mailConfig.sendToAgent && context.agentEmail) {
        console.log(`📤 Sending agent notification to: ${context.agentEmail}`);
        const agentUser = await this.userRepository.findOne({
          where: { email: context.agentEmail, deletedAt: IsNull() }
        });
        if (agentUser) {
          await this.mailService.sendAdminNotification(
            context.agentEmail,
            agentUser.name || 'Agente',
            context.interestedUserName || 'Usuario',
            context.interestedUserEmail || '',
            context.interestedUserPhone || undefined,
            context.propertyTitle || 'Propiedad',
            context.message || ''
          );
          console.log(`✅ Agent notification sent to: ${context.agentEmail}`);
        } else {
          console.log(`❌ Agent user not found for email: ${context.agentEmail}`);
        }
      } else {
        console.log(`❌ Not sending to agent - config: ${mailConfig.sendToAgent}, agentEmail: ${context.agentEmail}`);
      }

    } catch (error) {
      console.error(`❌ Error sending emails for notification ${notification.id}:`, error);
      console.error('Stack trace:', error.stack);
      // No lanzamos el error para no afectar la creación de la notificación
    }
  }

  /**
   * Construye el contexto necesario para los correos basado en la notificación
   */
  private async buildMailContext(
    notification: Notification,
    createDto: CreateNotificationDto
  ): Promise<any> {
    const context: any = {
      interestedUserEmail: notification.interestedUserEmail,
      interestedUserName: notification.interestedUserName,
      interestedUserPhone: notification.interestedUserPhone || createDto?.interestedUserPhone,
      message: notification.interestedUserMessage,
    };

    // Para notificaciones de solicitud de publicación, extraer detalles del mensaje
    if (notification.type === NotificationType.PROPERTY_PUBLICATION_REQUEST || 
        notification.type === NotificationType.PUBLICATION_STATUS_CHANGE) {
      // Formato esperado en NotificationsService.notifyPropertyPublicationRequestToAdmins:
      // `Nueva solicitud de publicación: ${userName} (${userEmail}) ha solicitado publicar la propiedad "${propertyTitle}" (${propertyType} en ${propertyOperation}).`
      // O en notifyPropertyStatusChange: `El estado de tu propiedad "${property.title}" ha cambiado a "${newStatusLabel}".`
      const titleMatch = notification.message?.match(/"([^"]+)"/);
      const operationMatch = notification.message?.match(/\(([^)]+)\)\.$/); // Busca el final del mensaje: `(Propiedad en Venta).`

      if (titleMatch) {
        context.propertyTitle = titleMatch[1];
      }

      if (operationMatch) {
        // El operationMatch[1] sería algo como "Propiedad en Venta"
        context.propertyOperation = operationMatch[1];
      }
      
      // Si no los encuentra por regex, usar los campos de interestedUserMessage si los pusimos ahí
      if (!context.propertyTitle && notification.interestedUserMessage?.includes(': ')) {
        context.propertyTitle = notification.interestedUserMessage.split(': ')[1];
      }
    }

    // Para notificaciones de interés, intentar obtener información de la propiedad
    if (notification.type === NotificationType.INTEREST) {
      // Extraer propertyId del mensaje si está presente
      const propertyMatch = notification.message?.match(/propiedad\s+([^\s.]+)/i);
      if (propertyMatch) {
        const propertyId = propertyMatch[1].trim();
        try {
          // Aquí podríamos hacer una consulta a la base de datos para obtener el título de la propiedad
          // Por ahora, usamos el ID como título
          context.propertyTitle = `Propiedad ${propertyId}`;
          context.propertyId = propertyId;
        } catch (error) {
          console.warn(`Could not get property info for ${propertyId}:`, error);
          context.propertyTitle = `Propiedad ${propertyId}`;
        }
      }

      // Intentar obtener email del agente asignado si hay uno
      if (notification.targetUserIds && notification.targetUserIds.length > 0) {
        // Buscar si hay un agente asignado (no admin)
        for (const userId of notification.targetUserIds) {
          try {
            const user = await this.usersService.findOne(userId);
            if (user && user.role !== 'ADMIN') {
              context.agentEmail = user.email;
              context.agentName = user.name;
              break; // Tomar el primer agente encontrado
            }
          } catch (error) {
            console.warn(`Could not get user info for ${userId}:`, error);
          }
        }
      }
    }

    return context;
  }

  /**
   * Obtiene emails de administradores de una lista de userIds
   */
  private async getAdminEmails(userIds: string[]): Promise<string[]> {
    const emails: string[] = [];
    for (const userId of userIds) {
      try {
        const user = await this.usersService.findOne(userId);
        if (user?.email && user.role === 'ADMIN') {
          emails.push(user.email);
        }
      } catch (error) {
        console.warn(`Could not get email for admin user ${userId}:`, error);
      }
    }
    return emails;
  }
}
