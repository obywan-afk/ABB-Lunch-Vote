-- CreateTable
CREATE TABLE "public"."VoteHistory" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "originalVoteDate" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoteHistory_weekOf_idx" ON "public"."VoteHistory"("weekOf");

-- CreateIndex
CREATE INDEX "VoteHistory_archivedAt_idx" ON "public"."VoteHistory"("archivedAt");

-- AddForeignKey
ALTER TABLE "public"."VoteHistory" ADD CONSTRAINT "VoteHistory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
