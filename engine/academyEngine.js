import { addUniverseNews } from "./newsEngine.js";

const score = driver => (driver.potentialAbilityMax ?? driver.potential ?? 60) + (driver.currentAbility ?? 55) * .35 - (driver.age ?? 24) * .8;

export function processAcademies(world) {
  const generated = [];
  for (const academy of world.academies ?? []) {
    const drivers = world.drivers
      .filter(d => !d.retired && d.academyId === academy.id && d.age <= 24)
      .sort((a, b) => score(b) - score(a));
    if (!drivers.length) continue;

    const protectedSlots = academy.driverSlots ?? 2;
    const priority = drivers.slice(0, protectedSlots);
    const pressure = academy.aggressiveness ?? 50;
    for (const driver of priority) {
      driver.scoutNoise = Math.max(driver.scoutNoise ?? 0, Math.round((100 - pressure) / 8));
      if ((world.worldTick ?? 0) % 8 === 0 && Math.random() < pressure / 170) {
        addUniverseNews(
          world,
          "Academia bajo la lupa",
          `${academy.name} empieza a preparar el futuro de ${driver.name}; varios equipos piden informes de scouting más profundos.`,
          "info",
          driver.categoryId,
          "Academia"
        );
        generated.push({ academyId: academy.id, driverId: driver.id });
      }
    }
  }
  return generated;
}
