CREATE UNIQUE INDEX "UX_Carts_UserID_Active"
ON "Carts"("UserID")
WHERE "CartStatus" = 'Active';
