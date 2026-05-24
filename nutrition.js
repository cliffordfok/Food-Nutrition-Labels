(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NutritionParser = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const BASIS_WARNING = "未能確認標籤基準，分數只供初步參考";

  const nutrientPatterns = {
    energy: /(?:energy|calories|calorie|熱量|能量)\D{0,16}(\d+(?:\.\d+)?)\s*(kcal|kj|千卡|卡路里)?/i,
    sugar: /(?:sugars?|糖|糖質)\D{0,16}(\d+(?:\.\d+)?)\s*g/i,
    sodium: /(?:sodium|鈉)\D{0,16}(\d+(?:\.\d+)?)\s*(mg|毫克|g|克)?/i,
    satFat: /(?:saturated\s*fat|saturates|飽和脂肪)\D{0,16}(\d+(?:\.\d+)?)\s*g/i,
    fat: /(?:total\s*fat|總脂肪)\D{0,16}(\d+(?:\.\d+)?)\s*g/i,
    protein: /(?:protein|蛋白質)\D{0,16}(\d+(?:\.\d+)?)\s*g/i,
    fiber: /(?:fibre|fiber|膳食纖維|纖維)\D{0,16}(\d+(?:\.\d+)?)\s*g/i,
  };

  function normalizeText(text) {
    return String(text || "")
      .replace(/[：:]/g, ":")
      .replace(/[，,]/g, ",")
      .replace(/\s+/g, " ")
      .trim();
  }

  function detectBasis(text) {
    const normalized = normalizeText(text).toLowerCase();
    if (/(?:per|\/)\s*100\s*g|每\s*100\s*(?:g|克)/i.test(normalized)) {
      return { type: "per100g", label: "每100g" };
    }
    if (/(?:per|\/)\s*100\s*ml|每\s*100\s*(?:ml|毫升)/i.test(normalized)) {
      return { type: "per100ml", label: "每100ml" };
    }
    if (/per\s*serving|serving|每\s*份|每份|食用分量|servings?/i.test(normalized)) {
      return { type: "perServing", label: "每份" };
    }
    return { type: "unknown", label: "未能確認" };
  }

  function parseNutrition(text) {
    const normalized = normalizeText(text);
    const nutrients = Object.fromEntries(
      Object.entries(nutrientPatterns).map(([key, pattern]) => {
        const match = key === "fat" ? matchFat(text, normalized, pattern) : normalized.match(pattern);
        if (!match) return [key, null];
        return [
          key,
          {
            value: Number.parseFloat(match[1]),
            unit: normalizeUnit(match[2], key),
          },
        ];
      }),
    );
    const basis = detectBasis(normalized);
    return {
      ...nutrients,
      basis,
      basisWarning: basis.type === "unknown" ? BASIS_WARNING : "",
    };
  }

  function matchFat(rawText, normalized, totalFatPattern) {
    const totalFat = normalized.match(totalFatPattern);
    if (totalFat) return totalFat;

    const lines = String(rawText || "").split(/\r?\n|,/);
    for (const line of lines) {
      if (/saturated|saturates|飽和/i.test(line)) continue;
      const match = line.match(/(?:^|\s)(?:fat|脂肪)\D{0,16}(\d+(?:\.\d+)?)\s*g/i);
      if (match) return match;
    }
    return null;
  }

  function normalizeUnit(unit, key) {
    if (key === "energy") return /kj/i.test(unit || "") ? "kJ" : "kcal";
    if (key === "sodium") return /^(?:g|克)$/i.test(String(unit || "").trim()) ? "g" : "mg";
    return "g";
  }

  return {
    BASIS_WARNING,
    detectBasis,
    normalizeText,
    parseNutrition,
  };
});
