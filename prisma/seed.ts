import { PrismaClient, Category, Gender, Size } from '@prisma/client';

const prisma = new PrismaClient();

const colorsData = [
  { name: 'Black', hexCode: '#000000' },
  { name: 'White', hexCode: '#FFFFFF' },
  { name: 'Red', hexCode: '#FF0000' },
  { name: 'Blue', hexCode: '#0000FF' },
  { name: 'Green', hexCode: '#00FF00' },
];

function randomPrice(min = 20, max = 200) {
  return (Math.random() * (max - min) + min).toFixed(2);
}

function randomStock() {
  return Math.floor(Math.random() * 50) + 1;
}

async function main() {
  console.log('🌱 Seeding...');

  // 1️⃣ Crear colores si no existen
  for (const color of colorsData) {
    await prisma.color.upsert({
      where: { name: color.name },
      update: {},
      create: color,
    });
  }

  const colors = await prisma.color.findMany();

  const categories = Object.values(Category);
  const genders = Object.values(Gender);
  const sizes = Object.values(Size);

  // 2️⃣ Crear 100 productos
  for (let i = 1; i <= 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];

    const product = await prisma.product.create({
      data: {
        name: `Product ${i}`,
        slug: `product-${i}-${Date.now()}`,
        description: `Description for product ${i}`,
        price: randomPrice(),
        category,
        gender,
        isActive: true,
      },
    });

    // 3️⃣ Crear variantes (3 sizes × 3 colores random)
    const selectedSizes = sizes.sort(() => 0.5 - Math.random()).slice(0, 3);
    const selectedColors = colors.sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const size of selectedSizes) {
      for (const color of selectedColors) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            stock: randomStock(),
            colorId: color.id,
            imageUrl: `https://picsum.photos/seed/${product.id}-${size}-${color.id}/400/400`,
          },
        });
      }
    }
  }

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
