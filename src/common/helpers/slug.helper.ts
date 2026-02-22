import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';

export async function generateUniqueSlug(
  prisma: PrismaService,
  model: 'product',
  name: string,
): Promise<string> {
  const baseSlug = slugify(name, {
    lower: true,
    strict: true,
    trim: true,
  });

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma[model].findUnique({
      where: { slug },
    });

    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
