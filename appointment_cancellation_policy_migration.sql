-- Client self-cancellation policy. Existing organizations remain opt-in.
ALTER TABLE organization_policies
  ADD COLUMN IF NOT EXISTS auto_cancellation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancellation_notice_days integer NOT NULL DEFAULT 0;

ALTER TABLE organization_policies
  DROP CONSTRAINT IF EXISTS organization_policies_cancellation_notice_days_nonnegative;

ALTER TABLE organization_policies
  ADD CONSTRAINT organization_policies_cancellation_notice_days_nonnegative
  CHECK (cancellation_notice_days >= 0);
