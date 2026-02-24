import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

describe('Cart E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Producto y variante base para todos los tests
  let productId: number;
  let variantId: number;
  let variantId2: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaService);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser()); // ← esto falta
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
    // Limpiar en orden correcto por foreign keys
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();

    // Crear color base
    const color = await prisma.color.upsert({
      where: { name: 'Black' },
      update: {},
      create: { name: 'Black', hexCode: '#000000' },
    });

    // Crear producto y variantes base para los tests
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
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

    productId = product.id;
    variantId = product.variants[0].id;
    variantId2 = product.variants[1].id;
  });

  // Helper para obtener el cartId de la cookie
  const getCartId = (res: request.Response): string => {
    const setCookie = res.headers['set-cookie'];
    console.log('set-cookie raw:', setCookie);
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const cartCookie = cookies?.find((c: string) => c.startsWith('cartId='));
    console.log('cartCookie:', cartCookie);
    const id = cartCookie?.split(';')[0].split('=')[1] ?? '';
    console.log('extracted id:', id);
    return id;
  };

  // ----------------------------
  // GET /cart
  // ----------------------------
  describe('GET /cart', () => {
    it('should create a new cart and return it with a cookie', async () => {
      const res = await request(app.getHttpServer()).get('/cart');

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.body.items).toEqual([]);
    });

    it('should return the same cart when sending existing cartId cookie', async () => {
      // Primera request — crea el cart
      const first = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(first);

      // Segunda request — reutiliza el cart
      const second = await request(app.getHttpServer())
        .get('/cart')
        .set('Cookie', `cartId=${cartId}`);

      expect(second.status).toBe(200);
      expect(second.body.id).toBe(first.body.id);
    });
  });

  // ----------------------------
  // POST /cart/items
  // ----------------------------
  describe('POST /cart/items', () => {
    it('should add an item to the cart', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(2);
      expect(res.body.productVariantId).toBe(variantId);
    });

    it('should accumulate quantity if item already exists', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 2 });

      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(5);
    });

    it('should return 400 if quantity exceeds stock', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 999 });

      expect(res.status).toBe(400);
    });

    it('should return 404 if variant does not exist', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: 999, quantity: 1 });

      expect(res.status).toBe(404);
    });

    it('should return 400 if quantity is 0', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const res = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 0 });

      expect(res.status).toBe(400);
    });
  });

  // ----------------------------
  // PATCH /cart/items/:itemId
  // ----------------------------
  describe('PATCH /cart/items/:itemId', () => {
    it('should update item quantity', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const addRes = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 2 });

      const itemId = addRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}`)
        .set('Cookie', `cartId=${cartId}`)
        .send({ quantity: 4 });

      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(4);
    });

    it('should return 404 if item does not belong to cart', async () => {
      // Crear dos carts distintos
      const cart1 = await request(app.getHttpServer()).get('/cart');
      const cart2 = await request(app.getHttpServer()).get('/cart');
      const cartId1 = getCartId(cart1);
      const cartId2 = getCartId(cart2);

      const addRes = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId1}`)
        .send({ productVariantId: variantId, quantity: 1 });

      const itemId = addRes.body.id;

      // Intentar modificar el item del cart1 desde el cart2
      const res = await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}`)
        .set('Cookie', `cartId=${cartId2}`)
        .send({ quantity: 3 });

      expect(res.status).toBe(404);
    });

    it('should return 400 if quantity exceeds stock', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const addRes = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 1 });

      const itemId = addRes.body.id;

      const res = await request(app.getHttpServer())
        .patch(`/cart/items/${itemId}`)
        .set('Cookie', `cartId=${cartId}`)
        .send({ quantity: 999 });

      expect(res.status).toBe(400);
    });
  });

  // ----------------------------
  // DELETE /cart/items/:itemId
  // ----------------------------
  describe('DELETE /cart/items/:itemId', () => {
    it('should remove an item from the cart', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const addRes = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 1 });

      const itemId = addRes.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/cart/items/${itemId}`)
        .set('Cookie', `cartId=${cartId}`);

      expect(res.status).toBe(204);

      // Verificar que el item ya no está
      const cart = await request(app.getHttpServer())
        .get('/cart')
        .set('Cookie', `cartId=${cartId}`);

      expect(cart.body.items).toHaveLength(0);
    });

    it('should return 404 if item does not exist', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      const res = await request(app.getHttpServer())
        .delete('/cart/items/999')
        .set('Cookie', `cartId=${cartId}`);

      expect(res.status).toBe(404);
    });
  });

  // ----------------------------
  // DELETE /cart/clear
  // ----------------------------
  describe('DELETE /cart/clear', () => {
    it('should clear all items from the cart', async () => {
      const init = await request(app.getHttpServer()).get('/cart');
      const cartId = getCartId(init);

      // Agregar dos items
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId, quantity: 1 });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Cookie', `cartId=${cartId}`)
        .send({ productVariantId: variantId2, quantity: 1 });

      const res = await request(app.getHttpServer())
        .delete('/cart/clear')
        .set('Cookie', `cartId=${cartId}`);

      expect(res.status).toBe(204);

      const cart = await request(app.getHttpServer())
        .get('/cart')
        .set('Cookie', `cartId=${cartId}`);

      expect(cart.body.items).toHaveLength(0);
    });
  });
});
