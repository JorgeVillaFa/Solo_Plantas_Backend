-- AlterTable
ALTER TABLE "plants"
  ADD CONSTRAINT "chk_growth_type"
    CHECK (
      "growthType" IS NULL OR
      "growthType" IN ('tall', 'wide', 'balanced')
    ),

  ADD CONSTRAINT "chk_dominant_color"
    CHECK (
      "dominantColor" IS NULL OR
      "dominantColor" IN ('blue', 'yellow', 'purple', 'green', 'white', 'orange')
    ),

  ADD CONSTRAINT "chk_season_category"
    CHECK (
      "seasonCategory" IS NULL OR
      "seasonCategory" IN ('spring', 'summer', 'fall', 'winter')
    );