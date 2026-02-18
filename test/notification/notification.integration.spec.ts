import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

describe('NotificationController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testNotificationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: 'admin@realestate.com', password: '7890' });

    adminToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /notifications - debe crear una nueva notificación', async () => {
    const notificationData = {
      targetUserIds: ['550e8400-e29b-41d4-a716-446655440000'],
      type: 'CONTACTO',
      targetMails: ['user@example.com'],
      status: 'SEND',
    };

    const response = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(notificationData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.type).toBe(notificationData.type);
    expect(response.body.status).toBe(notificationData.status);
    expect(Array.isArray(response.body.targetUserIds)).toBeTruthy();

    testNotificationId = response.body.id;
  });

  it('GET /notifications - debe obtener la lista de notificaciones', async () => {
    const response = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('POST /notifications/public/contact - debe crear notificaciones públicas con teléfono del interesado', async () => {
    const payload = {
      name: 'Contacto Test',
      email: 'contact.test@example.com',
      phone: '+56911112222',
      message: 'Mensaje desde test'
    };

    const resp = await request(app.getHttpServer())
      .post('/notifications/public/contact')
      .send(payload)
      .expect(201);

    expect(Array.isArray(resp.body)).toBeTruthy();
    expect(resp.body.length).toBeGreaterThan(0);
    const created = resp.body[0];
    expect(created).toHaveProperty('id');
    expect(created.interestedUserPhone).toBe(payload.phone);
    expect(created.interestedUserEmail).toBe(payload.email);
    expect(created.interestedUserName).toBe(payload.name);
  });

  it('POST /notifications/public/property-interest - debe crear notificaciones públicas de interés con teléfono', async () => {
    const payload = {
      propertyId: 'test-property-123',
      interestedUserName: 'Interesado Test',
      interestedUserEmail: 'interested.test@example.com',
      interestedUserPhone: '+56933334444',
      interestedUserMessage: 'Quiero visitar la propiedad'
    };

    const resp = await request(app.getHttpServer())
      .post('/notifications/public/property-interest')
      .send(payload)
      .expect(201);

    expect(Array.isArray(resp.body)).toBeTruthy();
    expect(resp.body.length).toBeGreaterThan(0);
    const created = resp.body[0];
    expect(created).toHaveProperty('id');
    expect(created.interestedUserPhone).toBe(payload.interestedUserPhone);
    expect(created.interestedUserEmail).toBe(payload.interestedUserEmail);
    expect(created.interestedUserName).toBe(payload.interestedUserName);
  });

  it('GET /notifications/:id - debe obtener una notificación por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/notifications/${testNotificationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testNotificationId);
    expect(response.body.type).toBe('CONTACTO');
    expect(response.body.status).toBe('SEND');
  });

  it('PATCH /notifications/:id - debe actualizar una notificación existente', async () => {
    const updateData = {
      type: 'COMPROBANTE_DE_PAGO',
      status: 'OPEN',
      targetMails: ['updated@example.com', 'admin@example.com'],
    };

    const response = await request(app.getHttpServer())
      .patch(`/notifications/${testNotificationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.type).toBe(updateData.type);
    expect(response.body.status).toBe(updateData.status);
    expect(response.body.targetMails).toContain('updated@example.com');
  });

  it('DELETE /notifications/:id - debe eliminar una notificación existente', async () => {
    await request(app.getHttpServer())
      .delete(`/notifications/${testNotificationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/notifications/${testNotificationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /notifications/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/notifications/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /notifications/user/:userId/grid/excel - debe exportar notificaciones filtradas a Excel (sin paginación)', async () => {
    const targetUserId = '550e8400-e29b-41d4-a716-446655440000';

    // Crear notificaciones de prueba para el usuario objetivo
    await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserIds: [targetUserId], type: 'INTEREST', message: 'Export test INTEREST', status: 'SEND' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserIds: [targetUserId], type: 'CONTACT', message: 'Export test CONTACT', status: 'SEND' })
      .expect(201);

    // Exportar solo las notificaciones de tipo INTEREST usando filtros
    const resp = await request(app.getHttpServer())
      .get(`/notifications/user/${targetUserId}/grid/excel?filters=type-INTEREST&filtration=true`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(resp.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(resp.headers['content-disposition']).toContain('attachment');
    // Supertest should return a Buffer for binary responses
    expect(Buffer.isBuffer(resp.body)).toBeTruthy();
    expect(resp.body.length).toBeGreaterThan(50);
  });
});
