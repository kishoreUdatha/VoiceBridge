import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
  // Check telecaller@demo.com
  const demoUser = await prisma.user.findFirst({
    where: { email: 'telecaller@demo.com' },
    select: { id: true, email: true, firstName: true, organizationId: true, isActive: true, role: { select: { name: true, slug: true } } }
  });
  console.log('telecaller@demo.com:', demoUser);

  // Check priya@smartgrow.com
  const priya = await prisma.user.findFirst({
    where: { email: 'priya@smartgrow.com' },
    select: { id: true, email: true, firstName: true, organizationId: true, isActive: true, role: { select: { name: true, slug: true } } }
  });
  console.log('priya@smartgrow.com:', priya);

  // If no telecaller in Smartgrow org, create one
  const smartgrowOrgId = '41b69d21-b342-4a63-872c-5b454cd23a86';

  const telecallerRole = await prisma.role.findFirst({
    where: { organizationId: smartgrowOrgId, slug: 'telecaller' }
  });
  console.log('Telecaller role:', telecallerRole?.id);

  if (telecallerRole && !priya) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const newUser = await prisma.user.create({
      data: {
        organizationId: smartgrowOrgId,
        email: 'priya@smartgrow.com',
        password: hashedPassword,
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+91 9876543210',
        roleId: telecallerRole.id,
        isActive: true
      }
    });
    console.log('Created telecaller:', newUser.email);
  } else if (priya) {
    // Reset password for priya
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.update({
      where: { id: priya.id },
      data: { password: hashedPassword }
    });
    console.log('Reset password for priya@smartgrow.com');
  }

  await prisma.$disconnect();
}

check();
