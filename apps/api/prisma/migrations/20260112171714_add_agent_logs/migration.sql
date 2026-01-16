-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_logs_userId_timestamp_idx" ON "agent_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "agent_logs_agentName_timestamp_idx" ON "agent_logs"("agentName", "timestamp");

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
