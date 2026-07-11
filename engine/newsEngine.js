export function addUniverseNews(world, title, body, tone = "info", categoryId = null, type = null, priority = "normal") {
  world.news ??= [];
  const createdAt = new Date().toISOString();
  world.news.unshift({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    headline: title,
    body,
    tone,
    type: type ?? inferNewsType(title, body),
    priority,
    categoryId,
    season: world.currentSeason,
    round: categoryId ? world.categoryStates?.[categoryId]?.currentRound : null,
    week: world.worldTick ?? 0,
    date: createdAt,
    createdAt,
    relatedEntities: inferRelatedEntities(world, title, body)
  });
  world.news = world.news.slice(0, 140);
}

function inferNewsType(title, body) {
  const text = `${title} ${body}`.toLowerCase();
  if (text.includes("oferta") || text.includes("contrato") || text.includes("mercado")) return "Mercado";
  if (text.includes("carrera") || text.includes("victoria") || text.includes("clasificación") || text.includes("race")) return "Carrera";
  if (text.includes("proyecto") || text.includes("mejora") || text.includes("i+d")) return "Ingeniería";
  if (text.includes("sponsor")) return "Sponsors";
  if (text.includes("academia") || text.includes("talento")) return "Academia";
  if (text.includes("staff") || text.includes("director")) return "Staff";
  if (text.includes("financ")) return "Finanzas";
  if (text.includes("rumor")) return "Rumores";
  if (text.includes("campeón") || text.includes("hist")) return "Histórico";
  return "General";
}

function inferRelatedEntities(world, title, body) {
  const text = `${title} ${body}`.toLowerCase();
  const entities = [];
  for (const team of world.teams ?? []) {
    if (team.name && text.includes(team.name.toLowerCase())) entities.push({ type: "team", id: team.id, name: team.name });
  }
  for (const driver of world.drivers ?? []) {
    if (driver.name && text.includes(driver.name.toLowerCase())) entities.push({ type: "driver", id: driver.id, name: driver.name });
  }
  for (const sponsor of world.sponsors ?? []) {
    if (sponsor.name && text.includes(sponsor.name.toLowerCase())) entities.push({ type: "sponsor", id: sponsor.id, name: sponsor.name });
  }
  return entities.slice(0, 6);
}

export function promotionInterestNews(world, categoryId) {
  const state = world.categoryStates[categoryId];
  const category = world.categories.find(c => c.id === categoryId);
  const driver = world.drivers.find(d => d.id === state.driverStandings[0]?.driverId);
  if (driver && category.level > 1) {
    addUniverseNews(
      world,
      "Talento bajo observación",
      `${driver.name} domina ${category.shortName} y atrae interés de categorías superiores.`,
      "positive",
      categoryId,
      "Academia"
    );
  }
}
