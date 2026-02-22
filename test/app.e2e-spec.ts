import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';

describe('Product E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
  });

  // =========================
  // PUBLIC TESTS
  // =========================

  describe('Product Public E2E', () => {
    it('GET /products should return 200 and empty array', async () => {
      const res = await request(app.getHttpServer()).get('/products');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('GET /products/:id should return 404 if not exists', async () => {
      const res = await request(app.getHttpServer()).get('/products/999');

      expect(res.status).toBe(404);
    });

    it('GET /products/:id should return product if exists', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Visible Product',
          description: 'desc',
          price: 50,
          slug: 'visible-product',
          category: 'TSHIRT',
          gender: 'UNISEX',
          isActive: true,
        },
      });

      const res = await request(app.getHttpServer()).get(
        `/products/${product.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(product.id);
    });

    it('Deleted product should not appear in public list', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Hidden Product',
          description: 'desc',
          price: 50,
          slug: 'hidden-product',
          category: 'TSHIRT',
          gender: 'UNISEX',
          isActive: true,
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer()).get('/products');

      expect(
        res.body.data.find((p: any) => p.id === product.id),
      ).toBeUndefined();
    });
  });

  // =========================
  // ADMIN TESTS
  // =========================

  describe('Product Admin E2E', () => {
    it('POST /admin/products should create product', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/products')
        .send({
          name: 'Test Product',
          description: 'Testing',
          price: 100,
          category: 'TSHIRT',
          gender: 'UNISEX',
          variants: [],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('POST /admin/products should fail validation', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/products')
        .send({
          name: '',
          price: -10,
        });
      console.log(res.body);
      expect(res.status).toBe(400);
    });

    it('PATCH should update product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Old Name',
          description: 'desc',
          price: 50,
          slug: 'old-name',
          category: 'TSHIRT',
          gender: 'UNISEX',
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/products/${product.id}`)
        .send({
          name: 'New Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
    });

    it('PATCH should return 404 if product not exists', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/products/999')
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
    });

    it('DELETE should soft delete product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Delete Me',
          description: 'desc',
          price: 50,
          slug: 'delete-me',
          category: 'TSHIRT',
          gender: 'UNISEX',
        },
      });

      const res = await request(app.getHttpServer()).delete(
        `/admin/products/${product.id}`,
      );

      expect(res.status).toBe(200);

      const deleted = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(deleted?.isActive).toBe(false);
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('DELETE should return 404 if product not exists', async () => {
      const res = await request(app.getHttpServer()).delete(
        '/admin/products/999',
      );

      expect(res.status).toBe(404);
    });
  });
});
