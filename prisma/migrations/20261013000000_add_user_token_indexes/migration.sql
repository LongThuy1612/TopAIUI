-- Email confirmation / password reset links look the user up by the token's
-- SHA-256 (server/utils/accountEmails.ts): without these, every click scans "User".
-- IF NOT EXISTS: safe on a database that got them through `db push`.
CREATE INDEX IF NOT EXISTS "User_verificationToken_idx" ON "User"("verificationToken");
CREATE INDEX IF NOT EXISTS "User_passwordResetToken_idx" ON "User"("passwordResetToken");
