import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';
import { TeamMember } from '../../src/entities/team-member.entity';

describe('TeamMemberController (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let testTeamMemberId: string;

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

  it('POST /team-members - debe crear un nuevo miembro del equipo', async () => {
    const teamMemberData = {
      name: 'Juan Pérez',
      position: 'Agente Inmobiliario Senior',
      bio: 'Experto en ventas de propiedades residenciales con más de 10 años de experiencia.',
      phone: '+56 9 1234 5678',
      mail: 'juan.perez@realestate.com',
      multimediaUrl: 'https://example.com/images/juan-perez.jpg',
    };

    const response = await request(app.getHttpServer())
      .post('/team-members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(teamMemberData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(teamMemberData.name);
    expect(response.body.position).toBe(teamMemberData.position);
    expect(response.body.bio).toBe(teamMemberData.bio);

    testTeamMemberId = response.body.id;
  });

  it('GET /team-members - debe obtener la lista de miembros del equipo', async () => {
    const response = await request(app.getHttpServer())
      .get('/team-members')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /team-members/:id - debe obtener un miembro del equipo por ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/team-members/${testTeamMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.id).toBe(testTeamMemberId);
    expect(response.body.name).toBe('Juan Pérez');
    expect(response.body.position).toBe('Agente Inmobiliario Senior');
  });

  it('PATCH /team-members/:id - debe actualizar un miembro del equipo existente', async () => {
    const updateData = {
      position: 'Gerente de Ventas',
      bio: 'Experto en ventas de propiedades residenciales y comerciales con más de 12 años de experiencia.',
    };

    const response = await request(app.getHttpServer())
      .patch(`/team-members/${testTeamMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updateData)
      .expect(200);

    expect(response.body.position).toBe(updateData.position);
    expect(response.body.bio).toBe(updateData.bio);
  });

  it('DELETE /team-members/:id - debe eliminar un miembro del equipo existente', async () => {
    await request(app.getHttpServer())
      .delete(`/team-members/${testTeamMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Verificar que ya no existe
    await request(app.getHttpServer())
      .get(`/team-members/${testTeamMemberId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /team-members/:id - debe fallar al buscar un ID que no existe', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer())
      .get(`/team-members/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
