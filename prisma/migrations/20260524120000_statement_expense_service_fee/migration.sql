-- AlterTable
ALTER TABLE "StatementExpense" ADD COLUMN "add_ten_percent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StatementExpense" ADD COLUMN "expense_category" TEXT;
