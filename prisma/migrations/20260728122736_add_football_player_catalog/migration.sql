-- CreateTable
CREATE TABLE "FootballPlayer" (
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "nationalityCode" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "shirtNumber" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballPlayer_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "FootballPlayer_isActive_idx" ON "FootballPlayer"("isActive");

-- CreateIndex
CREATE INDEX "FootballPlayer_nameEn_idx" ON "FootballPlayer"("nameEn");

-- CreateIndex
CREATE INDEX "FootballPlayer_club_idx" ON "FootballPlayer"("club");

-- Seed default catalog BEFORE FK (existing DailyMysteryPuzzle rows may reference these slugs).
INSERT INTO "FootballPlayer" ("slug","nameEn","nameFa","nationality","nationalityCode","position","league","club","age","shirtNumber","isActive","createdAt","updatedAt") VALUES
('messi','Lionel Messi','لیونل مسی','Argentina','AR','FWD','MLS','Inter Miami',37,10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ronaldo','Cristiano Ronaldo','کریستیانو رونالدو','Portugal','PT','FWD','Saudi Pro League','Al Nassr',40,7,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('mbappe','Kylian Mbappé','کیلیان امباپه','France','FR','FWD','La Liga','Real Madrid',26,9,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('haaland','Erling Haaland','ارلینگ هالند','Norway','NO','FWD','Premier League','Manchester City',24,9,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('salah','Mohamed Salah','محمد صلاح','Egypt','EG','FWD','Premier League','Liverpool',32,11,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('de_bruyne','Kevin De Bruyne','کوین دی‌بروینه','Belgium','BE','MID','Premier League','Manchester City',33,17,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('modric','Luka Modrić','لوکا مودریچ','Croatia','HR','MID','Saudi Pro League','Al Nassr',39,10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('bellingham','Jude Bellingham','جود بلینگام','England','GB','MID','La Liga','Real Madrid',21,5,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('vinicius','Vinícius Júnior','وینیسیوس جونیور','Brazil','BR','FWD','La Liga','Real Madrid',24,7,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('neymar','Neymar','نیمار','Brazil','BR','FWD','Saudi Pro League','Al Hilal',33,10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('van_dijk','Virgil van Dijk','ویرجیل فن‌دایک','Netherlands','NL','DEF','Premier League','Liverpool',33,4,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('alisson','Alisson','آلیسون','Brazil','BR','GK','Premier League','Liverpool',32,1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('courtois','Thibaut Courtois','تیبو کورتوا','Belgium','BE','GK','La Liga','Real Madrid',33,1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('taremi','Mehdi Taremi','مهدی طارمی','Iran','IR','FWD','Serie A','Inter',32,99,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('jahanbakhsh','Alireza Jahanbakhsh','علیرضا جهانبخش','Iran','IR','FWD','Eredivisie','Heerenveen',31,7,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ghoddos','Saman Ghoddos','سامان قدوس','Iran','IR','MID','Championship','Charlton Athletic',31,14,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('lewandowski','Robert Lewandowski','روبرت لواندوفسکی','Poland','PL','FWD','La Liga','Barcelona',36,9,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('kane','Harry Kane','هری کین','England','GB','FWD','Bundesliga','Bayern Munich',31,9,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('rodri','Rodri','رودری','Spain','ES','MID','Premier League','Manchester City',28,16,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('yamal','Lamine Yamal','لامین یامال','Spain','ES','FWD','La Liga','Barcelona',17,19,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- AddForeignKey
ALTER TABLE "DailyMysteryPuzzle" ADD CONSTRAINT "DailyMysteryPuzzle_targetPlayerId_fkey" FOREIGN KEY ("targetPlayerId") REFERENCES "FootballPlayer"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
