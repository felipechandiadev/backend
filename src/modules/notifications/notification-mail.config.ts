import { NotificationType } from '../../entities/notification.entity';
import { NotificationMailConfig } from '../mail/interfaces/mail-template.interface';

/**
 * Configuración centralizada para determinar qué tipos de notificación
 * envían correos electrónicos y qué plantillas usar
 */
export const NOTIFICATION_MAIL_CONFIG: Record<NotificationType, NotificationMailConfig> = {
  [NotificationType.INTEREST]: {
    sendToInterested: true,  // ✅ Envía correo al usuario interesado
    sendToAdmins: true,      // ✅ Envía notificación a administradores
    sendToAgent: true,       // ✅ Envía notificación al agente asignado
    template: 'interest-confirmation',
    subject: 'Hemos recibido tu interés en la propiedad',
    priority: 'normal',
  },

  [NotificationType.CONTACT]: {
    sendToInterested: false,
    sendToAdmins: true,
    sendToAgent: false,
    template: 'admin-notification',
    subject: 'Nuevo mensaje de contacto',
    priority: 'normal',
  },

  [NotificationType.PAYMENT_RECEIPT]: {
    sendToInterested: true,
    sendToAdmins: false,
    sendToAgent: false,
    template: 'payment-receipt',
    subject: 'Recibo de pago - Real Estate Platform',
    priority: 'high',
  },

  [NotificationType.PAYMENT_OVERDUE]: {
    sendToInterested: true,
    sendToAdmins: true,
    sendToAgent: false,
    template: 'payment-overdue',
    subject: 'Pago pendiente - Acción requerida',
    priority: 'high',
  },

  [NotificationType.PUBLICATION_STATUS_CHANGE]: {
    sendToInterested: true,
    sendToAdmins: false,
    sendToAgent: true,
    template: 'publication-status-change',
    subject: 'Cambio en el estado de publicación de propiedad',
    priority: 'normal',
  },

  [NotificationType.CONTRACT_STATUS_CHANGE]: {
    sendToInterested: false,
    sendToAdmins: true,
    sendToAgent: true,
    template: 'contract-status-change',
    subject: 'Actualización de contrato',
    priority: 'high',
  },

  [NotificationType.PROPERTY_AGENT_ASSIGNMENT]: {
    sendToInterested: false,
    sendToAdmins: false,
    sendToAgent: true,
    template: 'agent-assignment',
    subject: 'Nueva propiedad asignada',
    priority: 'normal',
  },

  [NotificationType.PROPERTY_PUBLICATION_REQUEST]: {
    sendToInterested: true,
    sendToAdmins: true,
    sendToAgent: false,
    template: 'property-publication-request',
    subject: 'Solicitud de publicación de propiedad recibida',
    priority: 'normal',
  },
};

/**
 * Helper function to get mail config for a notification type
 */
export function getNotificationMailConfig(type: NotificationType): NotificationMailConfig | null {
  return NOTIFICATION_MAIL_CONFIG[type] || null;
}

/**
 * Helper function to check if a notification type sends emails
 */
export function shouldSendEmail(type: NotificationType): boolean {
  const config = getNotificationMailConfig(type);
  return config ? Boolean(config.sendToInterested || config.sendToAdmins || config.sendToAgent) : false;
}