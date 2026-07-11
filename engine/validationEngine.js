export function validateGameState(world) {
  const warnings = [];
  const teamIds = new Set(world.teams.map(t => t.id));
  const driverIds = new Set(world.drivers.map(d => d.id));
  const sponsorIds = new Set((world.sponsors ?? []).map(s => s.id));
  const manufacturerIds = new Set((world.manufacturers ?? []).map(m => m.id));
  const academyIds = new Set((world.academies ?? []).map(a => a.id));
  const staffIds = new Set();
  const assigned = new Set();

  for (const team of world.teams) {
    const category = world.categories.find(c => c.id === team.categoryId);
    const slots = category?.driversPerTeam ?? 2;
    if (!team.carDevelopment) warnings.push(`${team.id}: falta carDevelopment`);
    if (!team.facilities) warnings.push(`${team.id}: faltan facilities`);
    if (!team.finances) warnings.push(`${team.id}: faltan finances`);
    if (!team.fanbase) warnings.push(`${team.id}: falta fanbase`);
    if ((team.drivers ?? []).length > slots) warnings.push(`${team.id}: más pilotos que slots (${team.drivers.length}/${slots})`);

    for (const driverId of team.drivers ?? []) {
      if (!driverIds.has(driverId)) warnings.push(`${team.id}: piloto inexistente ${driverId}`);
      if (assigned.has(driverId)) warnings.push(`piloto duplicado en equipos: ${driverId}`);
      assigned.add(driverId);
    }

    for (const contract of team.sponsorContracts ?? []) {
      if (!sponsorIds.has(contract.sponsorId)) warnings.push(`${team.id}: sponsor inexistente ${contract.sponsorId}`);
    }

    const supplier = team.supplierContracts ?? {};
    for (const key of ["engineSupplierId", "tyreSupplierId", "fuelSupplierId", "electronicsSupplierId"]) {
      if (supplier[key] && !manufacturerIds.has(supplier[key])) warnings.push(`${team.id}: proveedor inexistente ${supplier[key]}`);
    }

    const projects = [
      ...(world.developmentProjects ?? []).filter(p => p?.teamId === team.id),
      ...(world.facilityProjects ?? []).filter(p => p?.teamId === team.id),
      ...(world.projectHistory ?? []).filter(p => p?.teamId === team.id)
    ];
    const projectKeys = new Set();
    for (const project of projects) {
      if (!project || typeof project !== "object") continue;
      if (!["planned", "active"].includes(project.status)) continue;
      const key = `${project.type ?? project.area ?? "project"}:${project.component ?? project.facility ?? project.name}`;
      if (key.endsWith(":undefined")) continue;
      if (projectKeys.has(key)) warnings.push(`${team.id}: proyecto duplicado ${key}`);
      projectKeys.add(key);
    }
  }

  for (const driver of world.drivers) {
    if (driver.teamId && !teamIds.has(driver.teamId)) warnings.push(`${driver.id}: teamId inexistente ${driver.teamId}`);
    if (!driver.teamId && !driver.retired && driver.categoryId !== "free_agents") warnings.push(`${driver.id}: piloto libre fuera de free_agents`);
    const team = world.teams.find(t => t.id === driver.teamId);
    if (team && driver.categoryId !== team.categoryId) warnings.push(`${driver.id}: categoría distinta al equipo`);
    if (!driver.fanbase) warnings.push(`${driver.id}: falta fanbase`);
    if ((driver.currentAbility ?? 0) > 95) warnings.push(`${driver.id}: CA mayor a 95`);
    for (const [key, value] of Object.entries(driver.attributes ?? {})) {
      if (Number.isFinite(value) && value > 96) warnings.push(`${driver.id}: atributo ${key} mayor a 96`);
    }
  }

  for (const member of world.staff ?? []) {
    if (!teamIds.has(member.teamId)) warnings.push(`${member.id}: staff con teamId inexistente ${member.teamId}`);
    if (staffIds.has(member.id)) warnings.push(`staff duplicado ${member.id}`);
    staffIds.add(member.id);
  }

  validateRelationships(world, warnings, { teamIds, driverIds, sponsorIds, manufacturerIds, academyIds, staffIds });
  validateHistory(world, warnings);

  if (warnings.length) console.warn("[RUM validation]", warnings);
  return warnings;
}

function validateRelationships(world, warnings, ids) {
  for (const rel of world.relationships ?? []) {
    if (!rel.sourceId || !rel.targetId) warnings.push(`relación incompleta ${rel.id ?? rel.type}`);
    if (!entityExists(rel.sourceType, rel.sourceId, ids)) warnings.push(`relación huérfana origen ${rel.sourceType}:${rel.sourceId}`);
    if (!entityExists(rel.targetType, rel.targetId, ids)) warnings.push(`relación huérfana destino ${rel.targetType}:${rel.targetId}`);
    if (Number.isFinite(rel.strength) && (rel.strength < -100 || rel.strength > 100)) warnings.push(`relación fuera de rango ${rel.id}`);
  }
}

function entityExists(type, id, ids) {
  if (!id) return false;
  if (type === "team") return ids.teamIds.has(id);
  if (type === "driver") return ids.driverIds.has(id);
  if (type === "sponsor") return ids.sponsorIds.has(id);
  if (type === "manufacturer") return ids.manufacturerIds.has(id);
  if (type === "academy") return ids.academyIds.has(id);
  if (type === "staff") return ids.staffIds.has(id);
  if (type === "manager") return id === "manager" || id === "player";
  return true;
}

function validateHistory(world, warnings) {
  if (!world.history || !Array.isArray(world.history.seasons)) {
    warnings.push("history.seasons faltante o inválido");
    return;
  }
  for (const season of world.history.seasons) {
    if (!season.season || typeof season.categories !== "object") warnings.push(`historial corrupto temporada ${season.season ?? "?"}`);
    for (const [categoryId, category] of Object.entries(season.categories ?? {})) {
      if (!Array.isArray(category.driverStandings)) warnings.push(`historial ${season.season}/${categoryId}: driverStandings inválido`);
      if (!Array.isArray(category.teamStandings)) warnings.push(`historial ${season.season}/${categoryId}: teamStandings inválido`);
    }
  }
}
