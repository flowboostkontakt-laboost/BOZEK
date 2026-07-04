import { PrismaClient, Role, AttendanceType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Dane demonstracyjne odwzorowujące mockup:
 *  • Kategorie: Opaski 50%, Turbany 100%, Chusty 100%
 *  • Pracownice: Ania (1750/8h), Basia (1750/6h → norma 1312,5), Kasia (2000/8h)
 *  • Progi premiowe: 100% → 300 zł, 110% → 600 zł
 *  • Konta: admin/admin123, ania/praca123, basia/praca123, kasia/praca123
 */
async function main() {
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log("Seed pominięty — dane już istnieją.");
    return;
  }

  const [opaski, turbany, chusty] = await Promise.all([
    prisma.category.create({ data: { name: "Opaski", normPct: 50 } }),
    prisma.category.create({ data: { name: "Turbany", normPct: 100 } }),
    prisma.category.create({ data: { name: "Chusty", normPct: 100 } }),
  ]);

  await prisma.product.createMany({
    data: [
      { name: "Turban Velvet", last4: "0921", pricePln: "250.00", categoryId: turbany.id },
      { name: "Opaska czerwona", last4: "1015", pricePln: "120.00", categoryId: opaski.id },
      { name: "Chusta lniana", last4: "3307", pricePln: "180.00", categoryId: chusty.id },
    ],
  });

  const adminHash = await bcrypt.hash("admin123", 10);
  const workerHash = await bcrypt.hash("praca123", 10);

  await prisma.user.create({
    data: { login: "admin", passwordHash: adminHash, role: Role.ADMIN },
  });

  const employees = [
    { name: "Ania", baseNormPln: "1750.00", defaultHours: "8.0", login: "ania" },
    { name: "Basia", baseNormPln: "1750.00", defaultHours: "6.0", login: "basia" },
    { name: "Kasia", baseNormPln: "2000.00", defaultHours: "8.0", login: "kasia" },
  ];

  for (const e of employees) {
    const employee = await prisma.employee.create({
      data: { name: e.name, baseNormPln: e.baseNormPln, defaultHours: e.defaultHours },
    });
    await prisma.user.create({
      data: {
        login: e.login,
        passwordHash: workerHash,
        role: Role.WORKER,
        employeeId: employee.id,
      },
    });
    await prisma.attendance.create({
      data: { employeeId: employee.id, date: new Date(), type: AttendanceType.WORK, hours: e.defaultHours },
    });
  }

  await prisma.bonusTier.createMany({
    data: [
      { thresholdPct: 100, amountPln: "300.00", label: "Próg I" },
      { thresholdPct: 110, amountPln: "600.00", label: "Próg II" },
    ],
  });

  console.log("✅ Seed gotowy: admin/admin123 + ania/basia/kasia (praca123).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
