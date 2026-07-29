-- Approved destructive removal: seller payout accounts are no longer part of onboarding.
DROP TABLE IF EXISTS "SellerPayoutAccounts";
DROP TYPE IF EXISTS "PayoutStatus";
