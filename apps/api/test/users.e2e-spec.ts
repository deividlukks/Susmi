import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Criar usuário admin para testes
    const adminResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'ADMIN',
      });

    adminToken = adminResponse.body.accessToken;
    adminUserId = adminResponse.body.user.id;

    // Criar usuário regular para testes
    const userResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Regular User',
        email: 'user@test.com',
        password: 'user123',
        role: 'USER',
      });

    userToken = userResponse.body.accessToken;
    regularUserId = userResponse.body.user.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'user@test.com', 'newuser@test.com'],
        },
      },
    });

    await app.close();
  });

  describe('/api/users (GET)', () => {
    it('should return 401 when not authenticated', () => {
      return request(app.getHttpServer()).get('/api/users').expect(401);
    });

    it('should return 403 when user is not admin', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return list of users when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?page=1&pageSize=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(1);
    });
  });

  describe('/api/users (POST)', () => {
    it('should return 401 when not authenticated', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('should return 403 when user is not admin', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
        })
        .expect(403);
    });

    it('should create a new user when admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New User',
          email: 'newuser@test.com',
          password: 'password123',
          role: 'USER',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('newuser@test.com');
      expect(response.body.name).toBe('New User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 400 when email is invalid', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New User',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 409 when user already exists', () => {
      return request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'password123',
        })
        .expect(409);
    });
  });

  describe('/api/users/me (GET)', () => {
    it('should return current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.email).toBe('user@test.com');
      expect(response.body.name).toBe('Regular User');
    });

    it('should return 401 when not authenticated', () => {
      return request(app.getHttpServer()).get('/api/users/me').expect(401);
    });
  });

  describe('/api/users/:id (GET)', () => {
    it('should return user by id when admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(regularUserId);
    });

    it('should return 403 when user is not admin', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 404 when user not found', () => {
      return request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/api/users/:id (PUT)', () => {
    it('should update user when admin', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated User',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated User');
    });

    it('should return 403 when user is not admin', () => {
      return request(app.getHttpServer())
        .put(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked Admin',
        })
        .expect(403);
    });

    it('should return 404 when user not found', () => {
      return request(app.getHttpServer())
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated User',
        })
        .expect(404);
    });
  });

  describe('/api/users/:id (DELETE)', () => {
    it('should return 403 when user is not admin', () => {
      return request(app.getHttpServer())
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should delete user when admin', async () => {
      // Criar um usuário para deletar
      const createResponse = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'To Delete',
          email: 'todelete@test.com',
          password: 'password123',
        });

      const userIdToDelete = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificar que o usuário foi deletado
      await request(app.getHttpServer())
        .get(`/api/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when user not found', () => {
      return request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
