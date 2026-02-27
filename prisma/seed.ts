import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASE = 'https://res.cloudinary.com/dm8vhezlk/image/upload';
const TRANSFORM = 'q_auto,f_auto,w_800';

const COLORS = [
  { name: 'Black',      hexCode: '#111111' },
  { name: 'White',      hexCode: '#FAFAFA' },
  { name: 'Grey',       hexCode: '#888888' },
  { name: 'Blue',       hexCode: '#2C5F8A' },
  { name: 'Red',        hexCode: '#CB4154' },
  { name: 'Green',      hexCode: '#3A6B4A' },
  { name: 'Olive',      hexCode: '#6B6B3A' },
  { name: 'Pink',       hexCode: '#E8A0A0' },
  { name: 'Yellow',     hexCode: '#E8C84A' },
  { name: 'Light Blue', hexCode: '#7EB8D4' },
  { name: 'Mint',       hexCode: '#7ECFB8' },
  { name: 'Aquamarine', hexCode: '#5FBFAD' },
];

const img = (path: string) => `${BASE}/${TRANSFORM}/${path}`;

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.color.deleteMany();

  const colors = await Promise.all(COLORS.map((c) => prisma.color.create({ data: c })));
  const colorMap = Object.fromEntries(colors.map((c) => [c.name.toLowerCase().replace(' ', ''), c.id]));

  const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);

  const createProduct = async (data: {
    name: string;
    description: string;
    price: number;
    category: 'TSHIRT' | 'SWEATSHIRT' | 'JACKET' | 'PANTS' | 'SHOES';
    gender: 'MALE' | 'FEMALE' | 'UNISEX';
    variants: { colorName: string; imageUrl: string; sizes?: string[] }[];
  }) => {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: slug(data.name),
        description: data.description,
        price: data.price,
        category: data.category,
        gender: data.gender,
        isActive: true,
      },
    });

    for (const variant of data.variants) {
      const colorId = colorMap[variant.colorName.toLowerCase().replace(' ', '')];
      const sizes = variant.sizes ?? ['S', 'M', 'L', 'XL'];
      for (const size of sizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            colorId,
            size: size as any,
            stock: Math.floor(Math.random() * 20) + 5,
            imageUrl: variant.imageUrl,
          },
        });
      }
    }
  };

  // TSHIRTS
  await createProduct({
    name: 'Basic Fit Tee',
    description: 'Essential unisex tee with a clean fit.',
    price: 12500,
    category: 'TSHIRT',
    gender: 'UNISEX',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201623/unisex-tshirt-fit-black.jpg') },
      { colorName: 'blue',  imageUrl: img('v1772201626/unisex-tshirt-fit-blue.jpg') },
      { colorName: 'green', imageUrl: img('v1772201628/unisex-tshirt-fit-green.jpg') },
      { colorName: 'red',   imageUrl: img('v1772201652/unisex-tshirt-fit-red.jpg') },
      { colorName: 'white', imageUrl: img('v1772201656/unisex-tshirt-fit-white.jpg') },
    ],
  });

  await createProduct({
    name: 'Void Tee',
    description: 'Minimalist streetwear staple.',
    price: 11000,
    category: 'TSHIRT',
    gender: 'UNISEX',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201597/unisex-tshirt-basic-black.jpg') },
      { colorName: 'blue',  imageUrl: img('v1772201601/unisex-tshirt-basic-blue.jpg') },
      { colorName: 'green', imageUrl: img('v1772201608/unisex-tshirt-basic-green.jpg') },
      { colorName: 'red',   imageUrl: img('v1772201611/unisex-tshirt-basic-red.jpg') },
      { colorName: 'white', imageUrl: img('v1772201616/unisex-tshirt-basic-white.jpg') },
    ],
  });

  await createProduct({
    name: 'Polo Classic',
    description: 'Clean polo for everyday wear.',
    price: 15000,
    category: 'TSHIRT',
    gender: 'MALE',
    variants: [
      { colorName: 'black',  imageUrl: img('v1772201551/men-tshirt-polo-black.jpg') },
      { colorName: 'grey',   imageUrl: img('v1772201555/men-tshirt-polo-grey.jpg') },
      { colorName: 'red',    imageUrl: img('v1772201555/men-tshirt-polo-red.jpg') },
      { colorName: 'white',  imageUrl: img('v1772201557/men-tshirt-polo-white.jpg') },
      { colorName: 'yellow', imageUrl: img('v1772201558/men-tshirt-polo-yellow.jpg') },
    ],
  });

  await createProduct({
    name: 'Oversize Raw',
    description: 'Relaxed oversize cut with dropped shoulders.',
    price: 13500,
    category: 'TSHIRT',
    gender: 'MALE',
    variants: [
      { colorName: 'black',  imageUrl: img('v1772201541/men-tshirt-oversize-black.jpg') },
      { colorName: 'red',    imageUrl: img('v1772201545/men-tshirt-oversize-red.jpg') },
      { colorName: 'white',  imageUrl: img('v1772201547/men-tshirt-oversize-white.jpg') },
      { colorName: 'yellow', imageUrl: img('v1772201550/men-tshirt-oversize-yellow.jpg') },
    ],
  });

  await createProduct({
    name: 'Tank Top Bird',
    description: 'Lightweight tank with graphic detail.',
    price: 9500,
    category: 'TSHIRT',
    gender: 'MALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201564/men-tshirt-tank-top-bird-black.jpg') },
      { colorName: 'mint',  imageUrl: img('v1772201565/men-tshirt-tank-top-bird-mint.jpg') },
      { colorName: 'red',   imageUrl: img('v1772201568/men-tshirt-tank-top-bird-red.jpg') },
      { colorName: 'white', imageUrl: img('v1772201570/men-tshirt-tank-top-bird-white.jpg') },
    ],
  });

  await createProduct({
    name: 'Deportive Fit',
    description: 'Sporty fit tee for active looks.',
    price: 11500,
    category: 'TSHIRT',
    gender: 'FEMALE',
    variants: [
      { colorName: 'black',     imageUrl: img('v1772201527/female-tshirt-deportive-fit-black.jpg') },
      { colorName: 'lightblue', imageUrl: img('v1772201529/female-tshirt-deportive-fit-ligthblue.jpg') },
      { colorName: 'olive',     imageUrl: img('v1772201529/female-tshirt-deportive-fit-olive.jpg') },
      { colorName: 'red',       imageUrl: img('v1772201531/female-tshirt-deportive-fit-red.jpg') },
    ],
  });

  await createProduct({
    name: 'Relaxed Tee',
    description: 'Easy relaxed fit for all-day comfort.',
    price: 10500,
    category: 'TSHIRT',
    gender: 'FEMALE',
    variants: [
      { colorName: 'white', imageUrl: img('v1772201660/womens-relaxed-t-shirt-white-front-69a0f4186bdd4.jpg') },
    ],
  });

  // SWEATSHIRTS
  await createProduct({
    name: 'Unisex Hoodie',
    description: 'Heavyweight hoodie for any season.',
    price: 28000,
    category: 'SWEATSHIRT',
    gender: 'UNISEX',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201583/unisex-sweatshirt-hoodie-black.jpg') },
      { colorName: 'green', imageUrl: img('v1772201584/unisex-sweatshirt-hoodie-green.jpg') },
      { colorName: 'red',   imageUrl: img('v1772201586/unisex-sweatshirt-hoodie-red.jpg') },
      { colorName: 'white', imageUrl: img('v1772201591/unisex-sweatshirt-hoodie-white.jpg') },
    ],
  });

  await createProduct({
    name: 'Unisex Crewneck',
    description: 'Classic crewneck sweatshirt.',
    price: 24000,
    category: 'SWEATSHIRT',
    gender: 'UNISEX',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201574/unisex-sweatshirt-crewneck-black.jpg') },
      { colorName: 'blue',  imageUrl: img('v1772201575/unisex-sweatshirt-crewneck-blue.jpg') },
      { colorName: 'green', imageUrl: img('v1772201576/unisex-sweatshirt-crewneck-green.jpg') },
      { colorName: 'red',   imageUrl: img('v1772201581/unisex-sweatshirt-crewneck-red.jpg') },
      { colorName: 'white', imageUrl: img('v1772201582/unisex-sweatshirt-crewneck-white.jpg') },
    ],
  });

  await createProduct({
    name: 'Women Hoodie',
    description: 'Relaxed hoodie fit for women.',
    price: 26000,
    category: 'SWEATSHIRT',
    gender: 'FEMALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201674/women-sweatshirt-hoodie-black.jpg') },
      { colorName: 'grey',  imageUrl: img('v1772201676/women-sweatshirt-hoodie-grey.jpg') },
      { colorName: 'olive', imageUrl: img('v1772201678/women-sweatshirt-hoodie-olive.jpg') },
    ],
  });

  await createProduct({
    name: 'Women Crewneck',
    description: 'Soft crewneck with feminine silhouette.',
    price: 22000,
    category: 'SWEATSHIRT',
    gender: 'FEMALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201662/women-sweatshirt-crewneck-black.jpg') },
      { colorName: 'green', imageUrl: img('v1772201666/women-sweatshirt-crewneck-green.jpg') },
      { colorName: 'grey',  imageUrl: img('v1772201667/women-sweatshirt-crewneck-grey.jpg') },
      { colorName: 'pink',  imageUrl: img('v1772201669/women-sweatshirt-crewneck-pink.jpg') },
    ],
  });

  await createProduct({
    name: 'Turtleneck',
    description: 'Structured turtleneck for a clean silhouette.',
    price: 26000,
    category: 'SWEATSHIRT',
    gender: 'MALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201536/men-sweatshirt-turtleneck-black.jpg') },
      { colorName: 'blue',  imageUrl: img('v1772201539/men-sweatshirt-turtleneck-blue.jpg') },
      { colorName: 'grey',  imageUrl: img('v1772201542/men-sweatshirt-turtleneck-grey.jpg') },
    ],
  });

  // JACKETS
  await createProduct({
    name: 'Vest Jacket',
    description: 'Sleeveless jacket for layered looks.',
    price: 32000,
    category: 'JACKET',
    gender: 'MALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772201532/men-jacket-vest-black.jpg') },
      { colorName: 'blue',  imageUrl: img('v1772201533/men-jacket-vest-blue.jpg') },
      { colorName: 'grey',  imageUrl: img('v1772201534/men-jacket-vest-gray.jpg') },
    ],
  });

  await createProduct({
    name: 'Anorak',
    description: 'Lightweight anorak for wind and rain.',
    price: 38000,
    category: 'JACKET',
    gender: 'UNISEX',
    variants: [
      { colorName: 'black', imageUrl: img('v1772211713/unisex-jacket-anorak-black.jpg') },
      { colorName: 'blue',  imageUrl: img('v1772211718/unisex-jacket-anorak-blue.jpg') },
      { colorName: 'green', imageUrl: img('v1772211719/unisex-jacket-anorak-green.jpg') },
      { colorName: 'red',   imageUrl: img('v1772211721/unisex-jacket-anorak-red.jpg') },
    ],
  });

  await createProduct({
    name: 'Windbreaker',
    description: 'Technical windbreaker with clean lines.',
    price: 42000,
    category: 'JACKET',
    gender: 'FEMALE',
    variants: [
      { colorName: 'aquamarine', imageUrl: img('v1772211696/female-jacket-windbreaker-aquamarine.jpg') },
      { colorName: 'black',      imageUrl: img('v1772211698/female-jacket-windbreaker-black.jpg') },
      { colorName: 'red',        imageUrl: img('v1772211699/female-jacket-windbreaker-red.jpg') },
    ],
  });

  await createProduct({
    name: 'Field Jacket',
    description: 'Structured field jacket for everyday wear.',
    price: 45000,
    category: 'JACKET',
    gender: 'MALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772211701/male-jacket-.jpg') },
    ],
  });

  // PANTS
  await createProduct({
    name: 'Sweatpant',
    description: 'Relaxed sweatpant for comfort and style.',
    price: 18000,
    category: 'PANTS',
    gender: 'UNISEX',
    variants: [
      { colorName: 'black', imageUrl: img('v1772211725/unisex-pant-sweatpant-black.jpg') },
      { colorName: 'red',   imageUrl: img('v1772211727/unisex-pant-sweatpant-red.jpg') },
      { colorName: 'white', imageUrl: img('v1772211733/unisex-pant-sweatpant-white.jpg') },
    ],
  });

  await createProduct({
    name: 'Sport Short',
    description: 'Lightweight short for training or casual wear.',
    price: 14000,
    category: 'PANTS',
    gender: 'MALE',
    variants: [
      { colorName: 'black', imageUrl: img('v1772211705/male-pant-short-black.jpg'), sizes: ['XS', 'S', 'M', 'L', 'XL'] },
      { colorName: 'grey',  imageUrl: img('v1772211707/male-pant-short-grey.jpg'),  sizes: ['XS', 'S', 'M', 'L', 'XL'] },
      { colorName: 'white', imageUrl: img('v1772211711/male-pant-short-white.jpg'), sizes: ['XS', 'S', 'M', 'L', 'XL'] },
    ],
  });

  // SHOES
  await createProduct({
    name: 'Sport Sneaker',
    description: 'Clean sport sneaker for everyday use.',
    price: 52000,
    category: 'SHOES',
    gender: 'UNISEX',
    variants: [
      { colorName: 'blue', imageUrl: img('v1772211733/unisex-shoes-sport-blue.jpg'), sizes: ['S', 'M', 'L', 'XL'] },
    ],
  });

  console.log('Seed completado — 21 productos creados.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());