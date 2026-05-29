-- Default charge per mid-stay / manual clean on property statements
ALTER TABLE "Property" ADD COLUMN "mid_stay_clean_fee" DECIMAL(10,2);
