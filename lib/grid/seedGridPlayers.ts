/**
 * Iconic footballers with career + trophy history for Immortal Grid testing.
 * Idempotent upserts — safe to re-run. No `server-only` so CLI scripts can import.
 */

export type GridSeedPlayer = {
  slug: string;
  nameEn: string;
  nameFa: string;
  nationality: string;
  nationalityCode: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  league: string;
  club: string;
  age: number;
  shirtNumber: number;
  pastClubs: string[];
  trophies: string[];
};

/**
 * Curated pack: dense club/trophy overlap for 3×3 intersections
 * (e.g. Real Madrid ∩ Arsenal, Barcelona ∩ Chelsea, UCL ∩ World Cup).
 */
export const GRID_SEED_PLAYERS: GridSeedPlayer[] = [
  {
    slug: "ozil",
    nameEn: "Mesut Özil",
    nameFa: "مسعود اوزیل",
    nationality: "Germany",
    nationalityCode: "DE",
    position: "MID",
    league: "Retired",
    club: "Free Agent",
    age: 36,
    shirtNumber: 10,
    pastClubs: [
      "Real Madrid",
      "Arsenal",
      "Schalke 04",
      "Werder Bremen",
      "Fenerbahçe",
    ],
    trophies: ["World Cup", "La Liga", "FA Cup"],
  },
  {
    slug: "ronaldo",
    nameEn: "Cristiano Ronaldo",
    nameFa: "کریستیانو رونالدو",
    nationality: "Portugal",
    nationalityCode: "PT",
    position: "FWD",
    league: "Saudi Pro League",
    club: "Al Nassr",
    age: 40,
    shirtNumber: 7,
    pastClubs: [
      "Sporting CP",
      "Manchester United",
      "Real Madrid",
      "Juventus",
      "Al Nassr",
    ],
    trophies: [
      "UCL",
      "Ballon d'Or",
      "Euro",
      "Premier League",
      "La Liga",
      "Serie A",
    ],
  },
  {
    slug: "messi",
    nameEn: "Lionel Messi",
    nameFa: "لیونل مسی",
    nationality: "Argentina",
    nationalityCode: "AR",
    position: "FWD",
    league: "MLS",
    club: "Inter Miami",
    age: 37,
    shirtNumber: 10,
    pastClubs: ["Barcelona", "Paris Saint-Germain", "Inter Miami"],
    trophies: [
      "World Cup",
      "UCL",
      "Ballon d'Or",
      "La Liga",
      "Ligue 1",
      "Copa América",
    ],
  },
  {
    slug: "bellingham",
    nameEn: "Jude Bellingham",
    nameFa: "جود بلینگام",
    nationality: "England",
    nationalityCode: "GB",
    position: "MID",
    league: "La Liga",
    club: "Real Madrid",
    age: 21,
    shirtNumber: 5,
    pastClubs: ["Birmingham City", "Borussia Dortmund", "Real Madrid"],
    trophies: ["UCL", "La Liga", "Euro"],
  },
  {
    slug: "courtois",
    nameEn: "Thibaut Courtois",
    nameFa: "تیبو کورتوا",
    nationality: "Belgium",
    nationalityCode: "BE",
    position: "GK",
    league: "La Liga",
    club: "Real Madrid",
    age: 33,
    shirtNumber: 1,
    pastClubs: ["Genk", "Atlético Madrid", "Chelsea", "Real Madrid"],
    trophies: ["UCL", "La Liga", "Premier League", "Europa League"],
  },
  {
    slug: "fabregas",
    nameEn: "Cesc Fàbregas",
    nameFa: "سسک فابرگاس",
    nationality: "Spain",
    nationalityCode: "ES",
    position: "MID",
    league: "Retired",
    club: "Free Agent",
    age: 38,
    shirtNumber: 4,
    pastClubs: ["Barcelona", "Arsenal", "Chelsea", "Monaco", "Como"],
    trophies: ["World Cup", "Euro", "La Liga", "Premier League", "FA Cup"],
  },
  {
    slug: "mbappe",
    nameEn: "Kylian Mbappé",
    nameFa: "کیلیان امباپه",
    nationality: "France",
    nationalityCode: "FR",
    position: "FWD",
    league: "La Liga",
    club: "Real Madrid",
    age: 26,
    shirtNumber: 9,
    pastClubs: ["Monaco", "Paris Saint-Germain", "Real Madrid"],
    trophies: ["World Cup", "UCL", "Ligue 1", "La Liga"],
  },
  {
    slug: "neymar",
    nameEn: "Neymar",
    nameFa: "نیمار",
    nationality: "Brazil",
    nationalityCode: "BR",
    position: "FWD",
    league: "Saudi Pro League",
    club: "Al Hilal",
    age: 33,
    shirtNumber: 10,
    pastClubs: [
      "Santos",
      "Barcelona",
      "Paris Saint-Germain",
      "Al Hilal",
    ],
    trophies: ["UCL", "La Liga", "Ligue 1", "Copa América", "Olympics"],
  },
  {
    slug: "salah",
    nameEn: "Mohamed Salah",
    nameFa: "محمد صلاح",
    nationality: "Egypt",
    nationalityCode: "EG",
    position: "FWD",
    league: "Premier League",
    club: "Liverpool",
    age: 32,
    shirtNumber: 11,
    pastClubs: [
      "Basel",
      "Chelsea",
      "Fiorentina",
      "Roma",
      "Liverpool",
    ],
    trophies: ["UCL", "Premier League", "Serie A", "FA Cup"],
  },
  {
    slug: "modric",
    nameEn: "Luka Modrić",
    nameFa: "لوکا مودریچ",
    nationality: "Croatia",
    nationalityCode: "HR",
    position: "MID",
    league: "Saudi Pro League",
    club: "Al Nassr",
    age: 39,
    shirtNumber: 10,
    pastClubs: [
      "Dinamo Zagreb",
      "Tottenham Hotspur",
      "Real Madrid",
      "Al Nassr",
    ],
    trophies: ["UCL", "Ballon d'Or", "La Liga", "World Cup Runner-up"],
  },
];

/** Minimal DB surface — accepts PrismaClient without tight upsert generics. */
export type GridSeedUpsertClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  footballPlayer: { upsert: (args: any) => Promise<unknown> };
};

/** Upsert every GRID_SEED_PLAYERS row (overwrites career/trophy JSON). */
export async function upsertGridSeedPlayers(
  db: GridSeedUpsertClient,
): Promise<{ upserted: number; slugs: string[] }> {
  const slugs: string[] = [];
  for (const p of GRID_SEED_PLAYERS) {
    const data = {
      nameEn: p.nameEn,
      nameFa: p.nameFa,
      nationality: p.nationality,
      nationalityCode: p.nationalityCode,
      position: p.position,
      league: p.league,
      club: p.club,
      age: p.age,
      shirtNumber: p.shirtNumber,
      pastClubs: p.pastClubs,
      trophies: p.trophies,
      isActive: true,
    };
    await db.footballPlayer.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
    slugs.push(p.slug);
  }
  return { upserted: slugs.length, slugs };
}
