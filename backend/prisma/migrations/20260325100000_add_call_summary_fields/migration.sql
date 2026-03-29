-- AlterTable: Add call summary fields to OutboundCall
ALTER TABLE "outbound_calls" ADD COLUMN "callQualityScore" INTEGER;
ALTER TABLE "outbound_calls" ADD COLUMN "keyQuestionsAsked" JSONB DEFAULT '[]';
ALTER TABLE "outbound_calls" ADD COLUMN "keyIssuesDiscussed" JSONB DEFAULT '[]';
ALTER TABLE "outbound_calls" ADD COLUMN "sentimentIntensity" TEXT;
ALTER TABLE "outbound_calls" ADD COLUMN "agentSpeakingTime" INTEGER;
ALTER TABLE "outbound_calls" ADD COLUMN "customerSpeakingTime" INTEGER;
ALTER TABLE "outbound_calls" ADD COLUMN "nonSpeechTime" INTEGER;
ALTER TABLE "outbound_calls" ADD COLUMN "enhancedTranscript" JSONB;

-- Add index for call quality score queries
CREATE INDEX "outbound_calls_callQualityScore_idx" ON "outbound_calls"("callQualityScore");
