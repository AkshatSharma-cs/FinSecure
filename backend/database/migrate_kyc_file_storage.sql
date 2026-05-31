-- ============================================================
-- Migration: KYC document binary storage
-- Run this against finsecure_db ONCE before restarting the backend.
-- ============================================================

-- 1. Add the binary storage column (MEDIUMBLOB supports up to 16 MB)
ALTER TABLE kyc_documents
    ADD COLUMN file_data MEDIUMBLOB NULL AFTER file_name;

-- 2. Widen file_path so legacy text paths are not truncated
--    (new uploads leave this NULL; old rows keep whatever was stored)
ALTER TABLE kyc_documents
    MODIFY COLUMN file_path TEXT NULL;

-- 3. Increase the max allowed packet if needed (run as root / DBA)
--    SET GLOBAL max_allowed_packet = 16777216;   -- 16 MB
--    This may also need to be set in my.cnf: max_allowed_packet=16M
