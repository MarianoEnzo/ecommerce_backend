import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('Product E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let sellerToken: string;
  let customerToken: string;
  let createdProductIds: number[] = [];

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

    // Login helper
    const login = async (email: string, password: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password });
      return res.body.access_token;
    };

    adminToken = await login('admin@test.com', '123456');
    sellerToken = await login('seller@test.com', '123456');
    customerToken = await login('customer@test.com', '123456');
    const adminProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'desc',
        price: 100,
        slug: 'test-product',
        category: 'TSHIRT',
        gender: 'UNISEX',
        isActive: true,
      },
    });
    createdProductIds = [adminProduct.id];
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    createdProductIds = [];
  });

  // ----------------------------
  // Public endpoints
  // ----------------------------
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
        data: { isActive: false, deletedAt: new Date() },
      });

      const res = await request(app.getHttpServer()).get('/products');

      expect(
        res.body.data.find((p: any) => p.id === product.id),
      ).toBeUndefined();
    });
  });

  // ----------------------------
  // Admin endpoints
  // ----------------------------
  describe('Product Admin E2E', () => {
    const postProduct = (token: string, payload: any) =>
      request(app.getHttpServer())
        .post('/admin/products')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

    const patchProduct = (token: string, id: number, payload: any) =>
      request(app.getHttpServer())
        .patch(`/admin/products/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

    const deleteProduct = (token: string, id: number) =>
      request(app.getHttpServer())
        .delete(`/admin/products/${id}`)
        .set('Authorization', `Bearer ${token}`);

    it('ADMIN can create product', async () => {
      const res = await postProduct(adminToken, {
        name: 'Admin Product',
        description: 'Admin created product',
        price: 100,
        category: 'TSHIRT',
        gender: 'MALE',
        variants: [],
        isActive: true,
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdProductIds.push(res.body.id);
    });

    it('SELLER can create product', async () => {
      const res = await postProduct(sellerToken, {
        name: 'Seller Product',
        description: 'Seller created product',
        price: 120,
        category: 'JACKET',
        gender: 'FEMALE',
        variants: [],
        isActive: true,
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdProductIds.push(res.body.id);
    });

    it('CUSTOMER cannot create product', async () => {
      const res = await postProduct(customerToken, {
        name: 'Forbidden Product',
        description: 'Should not create',
        price: 50,
        category: 'TSHIRT',
        gender: 'UNISEX',
        variants: [],
        isActive: true,
      });
      expect(res.status).toBe(403);
    });

    it('Validation fails if missing fields', async () => {
      const res = await postProduct(adminToken, { name: '', price: -10 });
      expect(res.status).toBe(400);
    });

    it('ADMIN can update product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Temp Product',
          description: 'desc',
          price: 100,
          slug: 'temp-product',
          category: 'TSHIRT',
          gender: 'UNISEX',
          isActive: true,
        },
      });
      const res = await patchProduct(adminToken, product.id, {
        name: 'Updated Admin Product',
        price: 160,
      });
      console.log(res);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Admin Product');
      expect(res.body.price).toBe('160');
    });

    it('SELLER can update product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Temp Product',
          description: 'desc',
          price: 100,
          slug: 'temp-product',
          category: 'TSHIRT',
          gender: 'UNISEX',
          isActive: true,
        },
      });
      const res = await patchProduct(sellerToken, product.id, {
        name: 'Updated Seller Product',
        price: 170,
      });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Seller Product');
      expect(res.body.price).toBe('170');
    });

    it('CUSTOMER cannot update product', async () => {
      const productId = createdProductIds[0];
      const res = await patchProduct(customerToken, productId, {
        name: 'Should Not Update',
      });
      expect(res.status).toBe(403);
    });

    it('ADMIN can soft delete product', async () => {
      const product = await prisma.product.create({
        data: {
          name: 'Temp Product',
          description: 'desc',
          price: 100,
          slug: 'temp-product',
          category: 'TSHIRT',
          gender: 'UNISEX',
          isActive: true,
        },
      });
      const res = await deleteProduct(adminToken, product.id);
      expect(res.status).toBe(200);

      const deleted = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(deleted?.isActive).toBe(false);
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('DELETE returns 404 if product not exists', async () => {
      const res = await deleteProduct(adminToken, 999);
      expect(res.status).toBe(404);
    });
  });
});
