const assert = require("node:assert/strict");
const { BASIS_WARNING, detectBasis, parseNutrition } = require("../nutrition.js");

const english = parseNutrition(`
  Nutrition information per 100g
  Energy 120kcal
  Total Fat 8g
  Saturated Fat 3g
  Sugars 4.5g
  Sodium 300mg
`);
assert.equal(english.fat.value, 8);
assert.equal(english.satFat.value, 3);
assert.equal(english.sodium.value, 300);
assert.equal(english.sodium.unit, "mg");
assert.equal(english.basis.type, "per100g");

const chinese = parseNutrition(`
  每100克
  熱量 200 千卡
  糖 9g
  鈉 0.45g
  脂肪 11g
`);
assert.equal(chinese.energy.value, 200);
assert.equal(chinese.sugar.value, 9);
assert.equal(chinese.sodium.value, 0.45);
assert.equal(chinese.sodium.unit, "g");
assert.equal(chinese.fat.value, 11);
assert.equal(chinese.basis.type, "per100g");

const serving = parseNutrition("Per serving: calories 80 kcal, sodium 0.2g, total fat 2g");
assert.equal(serving.sodium.unit, "g");
assert.equal(serving.basis.type, "perServing");

const unknown = parseNutrition("Energy 80kcal Sugars 3g Sodium 120mg");
assert.equal(unknown.basis.type, "unknown");
assert.equal(unknown.basisWarning, BASIS_WARNING);

assert.equal(detectBasis("per 100ml").type, "per100ml");

console.log("parseNutrition tests passed");
