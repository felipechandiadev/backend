export interface MailTemplate {
  name: string;
  subject: string;
  description: string;
  requiredContext: string[];
  optionalContext?: string[];
}

export interface MailTemplateContext {
  // Usuario interesado
  interestedUserName?: string;
  interestedUserEmail?: string;

  // Propiedad
  propertyTitle?: string;
  propertyId?: string;

  // Destinatario
  recipientName?: string;

  // Contenido
  message?: string;

  // Empresa
  companyName?: string;
  contactEmail?: string;

  // Sistema
  currentYear?: number;

  // Campos adicionales
  [key: string]: any;
}

export interface NotificationMailConfig {
  sendToInterested?: boolean;
  sendToAdmins?: boolean;
  sendToAgent?: boolean;
  template: string;
  subject: string;
  priority?: 'low' | 'normal' | 'high';
}