const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const path = require("path");

async function seedAdmin() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@toothlink.org").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@ToothLink2026";
    const adminName = process.env.ADMIN_NAME || "ToothLink Administrator";

    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { role: "ADMIN" },
          { email: adminEmail },
        ],
      },
    });

    if (existingAdmin) {
      console.log(`[seedAdmin] Admin account already exists: ${existingAdmin.email} (Role: ${existingAdmin.role}, Status: ${existingAdmin.status})`);
      return existingAdmin;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    console.log(`[seedAdmin] Admin account created successfully: ${admin.email}`);
    return admin;
  } catch (error) {
    console.error("[seedAdmin] Failed to seed admin account:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  require("dotenv").config({ path: path.join(__dirname, "../../.env") });
  seedAdmin();
}

module.exports = seedAdmin;
