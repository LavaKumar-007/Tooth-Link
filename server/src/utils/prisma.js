const dns = require("dns");
// Force IPv4 resolution to prevent serverless Neon pooler drops on IPv6 networks
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const { PrismaClient } = require("@prisma/client");

let prisma;

if (!global.__toothlink_prisma) {
  global.__toothlink_prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}
prisma = global.__toothlink_prisma;

module.exports = prisma;
