import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JweAuthGuard } from '../../auth/jwe/jwe-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Audit } from '../../common/interceptors/audit.interceptor';
import { AuditAction, AuditEntityType } from '../../common/enums/audit.enums';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  UpdateNotificationStatusDto,
  PropertyInterestDto,
} from './dto/notification.dto';
import { ContactDto } from './dto/contact.dto';
import { NotificationType, NotificationSenderType } from '../../entities/notification.entity';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
    /**
     * Endpoint de prueba para verificar envío de correos (SOLO PARA DESARROLLO)
     */
    @Post('test-email')
    @ApiOperation({ summary: 'Test email sending (development only)' })
    async testEmail(@Body() body: { email: string; name: string }) {
      try {
        // Crear una notificación de prueba
        const testNotification = await this.notificationsService.notifyInterestOnProperty(
          'test-property-id',
          undefined, // sin agente
          undefined, // usuario anónimo
          body.name,
          body.email,
          'Este es un mensaje de prueba para verificar el envío de correos.'
        );

        return {
          success: true,
          message: 'Test notification created and emails should be sent',
          notificationIds: testNotification.map(n => n.id)
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }

    /**
     * Notifica interés en propiedad desde portal público (sin autenticación)
     */
    @Post('public/property-interest')
    @ApiOperation({ summary: 'Enviar notificación de interés en propiedad desde portal público' })
    @ApiBody({ type: PropertyInterestDto })
    async notifyPublicPropertyInterest(@Body() body: PropertyInterestDto) {
      return this.notificationsService.notifyInterestOnProperty(
        body.propertyId,
        body.assignedAgentId,
        body.interestedUserId,
        body.interestedUserName,
        body.interestedUserEmail,
        body.interestedUserPhone,
        body.interestedUserMessage
      );
    }

    /**
     * Notifica contacto general desde portal público (sin autenticación)
     */
    @Post('public/contact')
    @ApiOperation({ summary: 'Enviar notificación de contacto general desde portal público' })
    @ApiBody({ type: ContactDto })
    async notifyPublicContact(@Body() body: ContactDto) {
      console.log('📨 [CONTACT] Received body:', body);
      console.log('📨 [CONTACT] Phone value:', body.phone);
      return this.notificationsService.notifyContactToAdmins(
        body.name,
        body.email,
        body.phone,
        body.message
      );
    }

    /**
     * Notifica interés en propiedad a administradores y agente asignado
     * Puede ser llamado por usuario autenticado o anónimo
     */
    @Post('property-interest')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Enviar notificación de interés en propiedad a administradores y agente asignado' })
    @ApiBody({ type: PropertyInterestDto })
    async notifyInterestOnProperty(@Body() body: PropertyInterestDto) {
      return this.notificationsService.notifyInterestOnProperty(
        body.propertyId,
        body.assignedAgentId,
        body.interestedUserId,
        body.interestedUserName,
        body.interestedUserEmail,
        body.interestedUserPhone,
        body.interestedUserMessage
      );
    }
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Create a new notification
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiBody({ type: CreateNotificationDto })
  @Audit(AuditAction.CREATE, AuditEntityType.NOTIFICATION, 'Crear nueva notificación')
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  /**
   * Get all notifications with pagination
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of notifications',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Audit(AuditAction.READ, AuditEntityType.NOTIFICATION, 'Listar notificaciones')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.notificationsService.findAll(page, limit);
  }

  /**
   * Get notification by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification details with user information',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  @ApiParam({ name: 'id', type: String })
  @Audit(AuditAction.READ, AuditEntityType.NOTIFICATION, 'Obtener notificación por ID')
  findOne(@Param('id') id: string) {
    return this.notificationsService.getNotificationById(id);
  }

  /**
   * Update notification
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateNotificationDto })
  @Audit(AuditAction.UPDATE, AuditEntityType.NOTIFICATION, 'Actualizar notificación')
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  /**
   * Delete notification (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiParam({ name: 'id', type: String })
  @Audit(AuditAction.DELETE, AuditEntityType.NOTIFICATION, 'Eliminar notificación')
  softDelete(@Param('id') id: string) {
    return this.notificationsService.softDelete(id);
  }

  /**
   * Mark notification as opened
   */
  @Post(':id/open')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark notification as opened' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as opened',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      example: { viewerId: 'user-uuid' },
    },
  })
  @Audit(AuditAction.UPDATE, AuditEntityType.NOTIFICATION, 'Marcar notificación como abierta')
  markAsOpened(@Param('id') id: string, @Body('viewerId') viewerId: string) {
    return this.notificationsService.markAsOpened(id, viewerId);
  }

  /**
   * Get notifications for a specific user
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get notifications for user' })
  @ApiResponse({
    status: 200,
    description: 'User notifications list',
  })
  @ApiParam({ name: 'userId', type: String })
  @Audit(AuditAction.READ, AuditEntityType.NOTIFICATION, 'Obtener notificaciones de usuario')
  getNotificationsForUser(@Param('userId') userId: string) {
    return this.notificationsService.getNotificationsForUser(userId);
  }

  /**
   * Get unread notifications count for a user
   */
  @Get('user/:userId/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get unread notifications count for user' })
  @ApiResponse({
    status: 200,
    description: 'Number of unread notifications',
  })
  @ApiParam({ name: 'userId', type: String })
  @Audit(AuditAction.READ, AuditEntityType.NOTIFICATION, 'Obtener conteo de notificaciones no leídas')
  async countUnread(@Param('userId') userId: string): Promise<number> {
    return this.notificationsService.countUnread(userId);
  }

  /**
   * Mark all unread notifications as read for a user
   */
  @Patch('user/:userId/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all unread notifications as read for user' })
  @ApiResponse({
    status: 200,
    description: 'Number of notifications marked as read',
  })
  @ApiParam({ name: 'userId', type: String })
  @Audit(AuditAction.UPDATE, AuditEntityType.NOTIFICATION, 'Marcar todas las notificaciones como leídas')
  markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Update notification status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update notification status' })
  @ApiResponse({
    status: 200,
    description: 'Notification status updated',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateNotificationStatusDto })
  @Audit(AuditAction.UPDATE, AuditEntityType.NOTIFICATION, 'Actualizar status de notificación')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateNotificationStatusDto,
  ) {
    return this.notificationsService.updateStatus(id, updateStatusDto.status);
  }

  /**
   * Get user notifications grid with filtering, sorting, and pagination
   */
  @Get('user/:userId/grid')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user notifications grid' })
  @ApiResponse({
    status: 200,
    description: 'Paginated grid of user notifications',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'fields', required: false, type: String, description: 'Comma-separated list of fields' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiQuery({ name: 'sortField', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'filtration', required: false, type: Boolean })
  @ApiQuery({ name: 'filters', required: false, type: String, description: 'Comma-separated filters like "type-INTEREST,status-SEND"' })
  @ApiQuery({ name: 'pagination', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  @Audit(AuditAction.READ, AuditEntityType.NOTIFICATION, 'Obtener grid de notificaciones de usuario')
  getUserGridNotifications(
    @Param('userId') userId: string,
    @Query('fields') fields?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('sortField') sortField?: string,
    @Query('search') search?: string,
    @Query('filtration') filtration?: string,
    @Query('filters') filters?: string,
    @Query('pagination') pagination?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number,
  ) {
    const filtrationBool = filtration === 'true';
    const paginationBool = pagination !== 'false'; // Default to true

    return this.notificationsService.userGridNotifications(userId, {
      fields,
      sort,
      sortField,
      search,
      filtration: filtrationBool,
      filters,
      pagination: paginationBool,
      page,
      limit,
    });
  }

  /**
   * Export user notifications grid to Excel (UNPAGINATED) — respects filters, search and sort
   */
  @Get('user/:userId/grid/excel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Export user notifications grid to Excel' })
  @ApiResponse({ status: 200, description: 'Excel file exported successfully' })
  @ApiQuery({ name: 'fields', required: false, type: String, description: 'Comma-separated fields to export' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'sortField', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'filtration', required: false, type: Boolean })
  @ApiQuery({ name: 'filters', required: false, type: String })
  @Audit(AuditAction.READ, AuditEntityType.NOTIFICATION, 'Exportar notificaciones de usuario a Excel')
  async exportUserGridExcel(
    @Param('userId') userId: string,
    @Query('fields') fields?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('sortField') sortField?: string,
    @Query('search') search?: string,
    @Query('filtration') filtration?: string,
    @Query('filters') filters?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.notificationsService.exportUserGridNotificationsExcel(userId, {
      fields,
      sort,
      sortField,
      search,
      filtration: filtration === 'true',
      filters,
    });

    if (res) {
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="notificaciones.xlsx"',
      });
      res.send(buffer);
      return;
    }

    return buffer;
  }

  /**
   * DEBUG: Probar envío completo de correos
   */
  @Post('test-full-email-flow')
  @ApiOperation({ summary: 'DEBUG: Test complete email flow' })
  async testFullEmailFlow(@Body() body: { email: string; name: string }) {
    try {
      console.log('🎯 TESTING FULL EMAIL FLOW');
      console.log('Input:', body);

      // 1. Crear notificación de interés
      const notifications = await this.notificationsService.notifyInterestOnProperty(
        'test-property-123',
        undefined, // sin agente
        undefined, // usuario anónimo
        body.name,
        body.email,
        `Mensaje de prueba de ${body.name}`
      );

      console.log(`✅ Created ${notifications.length} notifications`);

      // 2. Forzar envío de correos para la primera notificación
      if (notifications.length > 0) {
        const notification = notifications[0];
        console.log('📧 Forcing email send for notification:', notification.id);

        const service = this.notificationsService as any;
        await service.sendNotificationEmails(notification, {
          targetMails: body.email ? [body.email] : undefined,
          interestedUserEmail: body.email,
          interestedUserName: body.name,
          interestedUserMessage: `Mensaje de prueba de ${body.name}`,
        });
      }

      return {
        success: true,
        message: 'Full email flow test completed',
        notificationsCreated: notifications.length,
        notificationIds: notifications.map(n => n.id)
      };
    } catch (error) {
      console.error('❌ FULL EMAIL FLOW TEST FAILED:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * DEBUG: Test simple email sending without notification creation
   */
  @Post('test-email-send')
  @ApiOperation({ summary: 'DEBUG: Test simple email sending' })
  async testEmailSend(@Body() body: { email: string; name: string }) {
    try {
      console.log('🧪 TESTING SIMPLE EMAIL SEND');
      console.log('Input:', body);

      // Importar MailService directamente
      const { MailService } = await import('../mail/mail.service');
      const mailService = (this.notificationsService as any).mailService;

      await mailService.sendInterestConfirmation(
        body.email,
        body.name,
        'Propiedad de Prueba',
        'Mensaje de prueba',
        undefined
      );

      return {
        success: true,
        message: `Email sent to ${body.email}`
      };
    } catch (error) {
      console.error('❌ EMAIL SEND TEST FAILED:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * DEBUG: Test complete flow without auth
   */
  @Post('test-complete-flow')
  // @UseGuards(JwtAuthGuard) // TEMPORALMENTE SIN AUTENTICACIÓN PARA TESTING
  @ApiOperation({ summary: 'DEBUG: Test complete flow without auth' })
  async testCompleteFlow(@Body() body: { email: string; name: string; message: string }) {
    try {
      console.log('🎯 TESTING COMPLETE FLOW WITHOUT AUTH');
      console.log('Input:', body);

      // Crear notificación directamente
      const dto: CreateNotificationDto = {
        senderType: NotificationSenderType.ANONYMOUS,
        senderId: undefined,
        senderName: body.name,
        isSystem: false,
        message: `Usuario ${body.name} está interesado en una propiedad`,
        targetUserIds: ['admin-user-id'], // Usar un ID dummy
        type: NotificationType.INTEREST,
        interestedUserEmail: body.email,
        interestedUserName: body.name,
        interestedUserMessage: body.message,
      };

      const notification = await this.notificationsService.create(dto);

      return {
        success: true,
        message: 'Complete flow test completed',
        notificationId: notification.id
      };
    } catch (error) {
      console.error('❌ COMPLETE FLOW TEST FAILED:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
}
