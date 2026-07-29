/**
 * Upsert a sample Logo Week RecordChallenge (Phase C).
 * Run: npx tsx scripts/seed-logo-week.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const expires = new Date();
  expires.setDate(expires.getDate() + 14);

  const c = await prisma.recordChallenge.upsert({
    where: { slug: "logo-week" },
    create: {
      slug: "logo-week",
      titleEn: "Logo Week",
      titleFa: "هفته لوگو",
      descriptionEn:
        "IMAGE & REVEAL formats dominate — prove you know the crests.",
      descriptionFa: "فرمت‌های تصویری غالب‌اند — لوگوها را بشناس.",
      unlockCostCoins: 200,
      targetScore: 15,
      rewardBadgeSlug: "logo_week",
      rewardBadgeEmoji: "🖼️",
      themeKey: "logo",
      preferredTypes: ["IMAGE", "REVEAL_IMAGE"],
      formatBiasEveryN: 2,
      isActive: true,
      startsAt: new Date(),
      expiresAt: expires,
    },
    update: {
      themeKey: "logo",
      preferredTypes: ["IMAGE", "REVEAL_IMAGE"],
      formatBiasEveryN: 2,
      isActive: true,
      expiresAt: expires,
      descriptionEn:
        "IMAGE & REVEAL formats dominate — prove you know the crests.",
      descriptionFa: "فرمت‌های تصویری غالب‌اند — لوگوها را بشناس.",
    },
  });

  console.log(`Logo Week ready: ${c.slug} (${c.id}) theme=${c.themeKey}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
