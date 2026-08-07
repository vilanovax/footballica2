-- CreateTable
CREATE TABLE "TelegramNotifyLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "duelYourTurn" BOOLEAN NOT NULL DEFAULT true,
    "vaultNearlyFull" BOOLEAN NOT NULL DEFAULT true,
    "newspaperReady" BOOLEAN NOT NULL DEFAULT true,
    "staminaFull" BOOLEAN NOT NULL DEFAULT true,
    "lastDuelAt" TIMESTAMP(3),
    "lastVaultAt" TIMESTAMP(3),
    "lastNewspaperAt" TIMESTAMP(3),
    "lastStaminaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramNotifyLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramNotifyLink_userId_key" ON "TelegramNotifyLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramNotifyLink_chatId_key" ON "TelegramNotifyLink"("chatId");

-- AddForeignKey
ALTER TABLE "TelegramNotifyLink" ADD CONSTRAINT "TelegramNotifyLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
