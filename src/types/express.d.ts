import 'express';

declare module 'express' {
  interface Request {
    cartId?: string;
  }
}
