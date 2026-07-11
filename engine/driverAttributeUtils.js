const ATTRIBUTE_MAX = 96;
const CURRENT_ABILITY_MAX = 95;
const SCORE_KEYS = [
  "speed", "qualifying", "racePace", "consistency", "overtaking", "defending",
  "wetSkill", "tyreManagement", "raceStarts", "feedback", "adaptability",
  "pressure", "aggression"
];
const DIRECT_KEYS = [
  ...SCORE_KEYS, "fitness", "experience", "morale", "reputation", "marketability", "popularity"
];

const clamp = (value, min = 0, max = ATTRIBUTE_MAX) => {
  if (!Number.isFinite(value)) return value;
  return Math.max(min, Math.min(max, Math.round(value)));
};

export function clampDriverAttributes(driver) {
  if (!driver) return driver;
  driver.attributes ??= {};
  for (const key of SCORE_KEYS) {
    const value = driver.attributes[key] ?? driver[key];
    if (Number.isFinite(value)) {
      driver.attributes[key] = clamp(value, 1, ATTRIBUTE_MAX);
      driver[key] = driver.attributes[key];
    }
  }
  for (const key of DIRECT_KEYS) {
    if (Number.isFinite(driver[key])) driver[key] = clamp(driver[key], key === "experience" ? 0 : 1, ATTRIBUTE_MAX);
  }
  if (Number.isFinite(driver.currentAbility)) driver.currentAbility = clamp(driver.currentAbility, 1, CURRENT_ABILITY_MAX);
  if (Number.isFinite(driver.potentialAbilityMin)) driver.potentialAbilityMin = Math.max(driver.currentAbility ?? 1, Math.round(driver.potentialAbilityMin));
  if (Number.isFinite(driver.potentialAbilityMax)) driver.potentialAbilityMax = Math.max(driver.potentialAbilityMin ?? driver.currentAbility ?? 1, Math.round(driver.potentialAbilityMax));
  if (Number.isFinite(driver.potential)) driver.potential = driver.potentialAbilityMax ?? driver.potential;
  return driver;
}

export function clampAllDrivers(world) {
  for (const driver of world.drivers ?? []) clampDriverAttributes(driver);
  return world;
}
