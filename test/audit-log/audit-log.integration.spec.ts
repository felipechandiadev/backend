import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import {
  AuditAction,
  AuditEntityType,
  RequestSource,
} from '../../src/common/enums/audit.enums';

describe('AuditController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testAuditLogId: string;

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

  it('GET /audit/logs - debe obtener logs de auditoría con filtros', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        limit: 10,
        offset: 0,
      })
      .expect(200);

    expect(response.body).toHaveProperty('logs');
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.logs)).toBe(true);
    expect(typeof response.body.total).toBe('number');
  });

  it('GET /audit/logs - debe filtrar por acción', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        action: AuditAction.LOGIN,
        limit: 5,
      })
      .expect(200);

    expect(response.body).toHaveProperty('logs');
    expect(Array.isArray(response.body.logs)).toBe(true);

    // Si hay logs, verificar que todos tienen la acción correcta
    if (response.body.logs.length > 0) {
      response.body.logs.forEach((log: any) => {
        expect(log.action).toBe(AuditAction.LOGIN);
      });
    }
  });

  it('GET /audit/logs - debe filtrar por tipo de entidad', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        entityType: AuditEntityType.USER,
        limit: 5,
      })
      .expect(200);

    expect(response.body).toHaveProperty('logs');
    expect(Array.isArray(response.body.logs)).toBe(true);

    // Si hay logs, verificar que todos tienen el tipo de entidad correcto
    if (response.body.logs.length > 0) {
      response.body.logs.forEach((log: any) => {
        expect(log.entityType).toBe(AuditEntityType.USER);
      });
    }
  });

  it('GET /audit/logs - debe filtrar por éxito', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        success: true,
        limit: 5,
      })
      .expect(200);

    expect(response.body).toHaveProperty('logs');
    expect(Array.isArray(response.body.logs)).toBe(true);

    // Si hay logs, verificar que todos tienen success: true
    if (response.body.logs.length > 0) {
      response.body.logs.forEach((log: any) => {
        expect(log.success).toBe(true);
      });
    }
  });

  it('GET /audit/logs - debe filtrar por fuente', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        source: RequestSource.USER,
        limit: 5,
      })
      .expect(200);

    expect(response.body).toHaveProperty('logs');
    expect(Array.isArray(response.body.logs)).toBe(true);

    // Si hay logs, verificar que todos tienen la fuente correcta
    if (response.body.logs.length > 0) {
      response.body.logs.forEach((log: any) => {
        expect(log.source).toBe(RequestSource.USER);
      });
    }
  });

  it('GET /audit/logs/user/:userId - debe obtener logs de un usuario específico', async () => {
    // Primero necesitamos obtener un userId válido de los logs existentes
    const allLogsResponse = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 1 })
      .expect(200);

    if (
      allLogsResponse.body.logs.length > 0 &&
      allLogsResponse.body.logs[0].userId
    ) {
      const userId = allLogsResponse.body.logs[0].userId;

      const response = await request(app.getHttpServer())
        .get(`/audit/logs/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verificar que todos los logs pertenecen al usuario correcto
      response.body.forEach((log: any) => {
        expect(log.userId).toBe(userId);
      });
    } else {
      // Si no hay logs con userId, solo verificar que la respuesta es un array
      const response = await request(app.getHttpServer())
        .get('/audit/logs/user/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    }
  });

  it('GET /audit/logs/entity/:entityType/:entityId - debe obtener logs de una entidad específica', async () => {
    // Usar una entidad que sepamos que existe (como PROPERTY_TYPE)
    const entityType = AuditEntityType.PROPERTY_TYPE;
    const entityId = '550e8400-e29b-41d4-a716-446655440000'; // ID de ejemplo

    const response = await request(app.getHttpServer())
      .get(`/audit/logs/entity/${entityType}/${entityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 5 })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    // Verificar que todos los logs pertenecen a la entidad correcta
    response.body.forEach((log: any) => {
      expect(log.entityType).toBe(entityType);
      expect(log.entityId).toBe(entityId);
    });
  });

  it('GET /audit/stats - debe obtener estadísticas de auditoría', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: 7 })
      .expect(200);

    expect(response.body).toHaveProperty('period');
    expect(response.body).toHaveProperty('summary');
    expect(response.body).toHaveProperty('actions');
    expect(response.body).toHaveProperty('entities');

    // Verificar estructura del resumen
    expect(response.body.summary).toHaveProperty('totalLogs');
    expect(response.body.summary).toHaveProperty('successfulLogs');
    expect(response.body.summary).toHaveProperty('failedLogs');
    expect(response.body.summary).toHaveProperty('uniqueUsers');

    // Verificar que actions y entities son arrays
    expect(Array.isArray(response.body.actions)).toBe(true);
    expect(Array.isArray(response.body.entities)).toBe(true);
  });

  it('GET /audit/stats/actions - debe obtener estadísticas por acciones', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/stats/actions')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: 7 })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    // Si hay acciones, verificar estructura de cada una
    if (response.body.length > 0) {
      response.body.forEach((action: any) => {
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('count');
        expect(typeof action.count).toBe('number');
      });
    }
  });

  it('GET /audit/stats/entities - debe obtener estadísticas por entidades', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/stats/entities')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: 7 })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    // Si hay entidades, verificar estructura de cada una
    if (response.body.length > 0) {
      response.body.forEach((entity: any) => {
        expect(entity).toHaveProperty('entityType');
        expect(entity).toHaveProperty('count');
        expect(typeof entity.count).toBe('number');
      });
    }
  });

  it('GET /audit/stats/summary - debe obtener resumen de estadísticas', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit/stats/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ days: 7 })
      .expect(200);

    expect(response.body).toHaveProperty('totalLogs');
    expect(response.body).toHaveProperty('successfulLogs');
    expect(response.body).toHaveProperty('failedLogs');
    expect(response.body).toHaveProperty('uniqueUsers');

    // Values can be strings, numbers, or null depending on database and data
    expect(typeof response.body.totalLogs).toMatch(/string|number|object/);
    expect(typeof response.body.successfulLogs).toMatch(/string|number|object/);
    expect(typeof response.body.failedLogs).toMatch(/string|number|object/);
    expect(typeof response.body.uniqueUsers).toMatch(/string|number|object/);
  });

  it('GET /audit/logs - debe manejar paginación correctamente', async () => {
    const limit = 2;
    const offset = 0;

    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit, offset })
      .expect(200);

    expect(response.body.logs.length).toBeLessThanOrEqual(limit);
    expect(Array.isArray(response.body.logs)).toBe(true);
  });

  it('GET /audit/logs - debe manejar filtros de fecha', async () => {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 1); // Hace 1 día

    const dateTo = new Date(); // Ahora

    const response = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        limit: 10,
      })
      .expect(200);

    expect(Array.isArray(response.body.logs)).toBe(true);

    // Si hay logs, verificar que las fechas están en el rango
    if (response.body.logs.length > 0) {
      response.body.logs.forEach((log: any) => {
        const logDate = new Date(log.createdAt);
        expect(logDate >= dateFrom).toBe(true);
        expect(logDate <= dateTo).toBe(true);
      });
    }
  });
});
