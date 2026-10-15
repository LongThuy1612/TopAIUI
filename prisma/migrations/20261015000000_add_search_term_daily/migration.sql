-- CreateTable
CREATE TABLE "SearchTermDaily" (
    "day" DATE NOT NULL,
    "locale" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SearchTermDaily_pkey" PRIMARY KEY ("day","locale","term")
);

-- CreateIndex
CREATE INDEX "SearchTermDaily_locale_day_idx" ON "SearchTermDaily"("locale", "day");

