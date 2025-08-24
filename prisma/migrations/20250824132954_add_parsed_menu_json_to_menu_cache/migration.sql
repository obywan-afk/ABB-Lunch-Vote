-- CreateTable
CREATE TABLE "MenuCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "rawMenu" TEXT NOT NULL,
    "parsedMenu" TEXT NOT NULL,
    "parsedMenuJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuCache_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuCache_restaurantId_date_language_key" ON "MenuCache"("restaurantId", "date", "language");
