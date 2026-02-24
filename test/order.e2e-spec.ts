import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

describe('Order E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let variantId: number;
  let variantId2: number;

  const login = async (email: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });
    return res.body.access_token as string;
  };

  // Extrae el cartId de la cookie del response
  const getCartId = (res: request.Response): string => {
    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const cartCookie = cookies?.find((c: string) => c.startsWith('cartId='));
    return cartCookie?.split(';')[0].split('=')[1] ?? '';
  };

  // Crea un cart con items y devuelve el cartId
  const createCartWithItems = async (quantity = 2): Promise<string> => {
    const init = await request(app.getHttpServer()).get('/cart');
    const cartId = getCartId(init);

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', `cartId=${cartId}`)
      .send({ productVariantId: variantId, quantity });

    return cartId;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    adminToken = await login('admin@test.com', '123456');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar en orden correcto por foreign keys
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();

    const color = await prisma.color.upsert({
      where: { name: 'Black' },
      update: {},
      create: { name: 'Black', hexCode: '#000000' },
    });

    const product = await prisma.product.create({
      data: {
        name: 'Order Test Product',
        slug: 'order-test-product',
        description: 'desc',
        price: 100,
        category: 'TSHIRT',
        gender: 'UNISEX',
        isActive: true,
        variants: {
          create: [
            { size: 'M', stock: 10, colorId: color.id },
            { size: 'L', stock: 5, colorId: color.id },
          ],
        },
      },
      include: { variants: true },
    });

    variantId = product.variants[0].id;
    variantId2 = product.variants[1].id;
  });

  // ----------------------------
  // POST /orders
  // ----------------------------
  describe('POST /orders', () => {
    it('should create an order as guest and clear the cart cookie', async () => {
      const cartId = await createCartWithItems(2);

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'John Doe' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.contactName).toBe('John Doe');
      expect(res.body.items).toHaveLength(1);

      // Verificar que la cookie del carrito fue borrada
      const setCookie = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      const clearedCookie = cookies?.find((c: string) =>
        c.startsWith('cartId='),
      );
      expect(clearedCookie).toContain('Expires=Thu, 01 Jan 1970');
    });

    it('should create an order with optional email', async () => {
      const cartId = await createCartWithItems(1);

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Jane Doe', contactEmail: 'jane@test.com' });

      expect(res.status).toBe(201);
      expect(res.body.contactEmail).toBe('jane@test.com');
    });

    it('should discount stock after order is created', async () => {
      const cartId = await createCartWithItems(3);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Stock Test' });

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      // stock era 10, pedimos 3 → debe quedar 7
      expect(variant?.stock).toBe(7);
    });

    it('should mark cart as CHECKED_OUT after order', async () => {
      const cartId = await createCartWithItems(1);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Cart Status Test' });

      const cart = await prisma.cart.findUnique({ where: { id: cartId } });
      expect(cart?.status).toBe('CHECKED_OUT');
    });

    it('should return 400 if cart is empty', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Empty Cart' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if stock is insufficient', async () => {
      const cartId = await createCartWithItems(1);

      // Vaciar el stock manualmente
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: 0 },
      });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'No Stock' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if contactName is missing', async () => {
      const cartId = await createCartWithItems(1);

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactEmail: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if contactEmail is invalid', async () => {
      const cartId = await createCartWithItems(1);

      const res = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Test', contactEmail: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  // ----------------------------
  // GET /orders/:id
  // ----------------------------
  describe('GET /orders/:id', () => {
    it('should return an order by id', async () => {
      const cartId = await createCartWithItems(1);

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Get Order Test' });

      const orderId = createRes.body.id;

      const res = await request(app.getHttpServer()).get(`/orders/${orderId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
    });

    it('should return 404 if order does not exist', async () => {
      const res = await request(app.getHttpServer()).get('/orders/999');
      expect(res.status).toBe(404);
    });
  });

  // ----------------------------
  // GET /orders/my-orders
  // ----------------------------
  describe('GET /orders/my-orders', () => {
    it('should return orders of the logged in user', async () => {
      const customerToken = await login('customer@test.com', '123456');

      // Crear orden como usuario logueado
      const cartId = await createCartWithItems(1);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ contactName: 'My Orders Test' });

      const res = await request(app.getHttpServer())
        .get('/orders/my-orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].contactName).toBe('My Orders Test');
    });

    it('should return 401 if not logged in', async () => {
      const res = await request(app.getHttpServer()).get('/orders/my-orders');
      expect(res.status).toBe(401);
    });
  });

  // ----------------------------
  // GET /orders (admin)
  // ----------------------------
  describe('GET /orders (admin)', () => {
    it('should return all orders for admin', async () => {
      const cartId = await createCartWithItems(1);

      await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Admin List Test' });

      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return 403 if not admin', async () => {
      const customerToken = await login('customer@test.com', '123456');

      const res = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ----------------------------
  // PATCH /orders/:id/status (admin)
  // ----------------------------
  describe('PATCH /orders/:id/status', () => {
    it('should update order status from PENDING to PAID', async () => {
      const cartId = await createCartWithItems(1);

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Status Test' });

      const orderId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PAID');
    });

    it('should update order status from PENDING to CANCELLED', async () => {
      const cartId = await createCartWithItems(1);

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Cancel Test' });

      const orderId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('should return 400 for invalid status transition', async () => {
      const cartId = await createCartWithItems(1);

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Invalid Transition Test' });

      const orderId = createRes.body.id;

      // Primero cancelar
      await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' });

      // Intentar pasar de CANCELLED a PAID — no válido
      const res = await request(app.getHttpServer())
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(400);
    });

    it('should return 403 if not admin', async () => {
      const customerToken = await login('customer@test.com', '123456');
      const cartId = await createCartWithItems(1);

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Cookie', `cartId=${cartId}`)
        .send({ contactName: 'Forbidden Status Test' });

      const res = await request(app.getHttpServer())
        .patch(`/orders/${createRes.body.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(403);
    });

    it('should return 404 if order does not exist', async () => {
      const res = await request(app.getHttpServer())
        .patch('/orders/999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(404);
    });
  });
});
