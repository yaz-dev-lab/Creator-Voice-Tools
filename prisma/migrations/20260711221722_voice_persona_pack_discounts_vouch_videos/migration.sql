-- AlterTable
ALTER TABLE "packs" ADD COLUMN     "addonPriceCents" INTEGER,
ADD COLUMN     "discountEndsAt" TIMESTAMP(3),
ADD COLUMN     "discountPriceCents" INTEGER,
ADD COLUMN     "discountStartsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "voices" ADD COLUMN     "personaName" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "vouch_videos" (
    "id" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouch_videos_pkey" PRIMARY KEY ("id")
);
