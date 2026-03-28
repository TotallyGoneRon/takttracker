import * as XLSX from 'xlsx';

// ─── Types ─────────────────────────────────────────────────────

export interface ParsedActivity {
  taskId: string;
  taskName: string;
  phaseName: string;
  taktPeriod: number | null;
  startDate: string;
  finishDate: string;
  status: string;
  crewSize: number | null;
  description: string;
  area: string;
  color: string;
  predecessors: string;
  taskType: string;
  taskCode: string;
  company: string;
  companyColor: string;
  tags: string;
  handoffStatus: string;
  quantity: string;
  unit: string;
}

export interface ParsedRelationship {
  predecessorId: string;
  successorId: string;
  relationType: 'FS' | 'SS' | 'FF' | 'SF';
  lagHours: number;
}

export interface DetectedBuilding {
  code: string;
  name: string;
  numFloors: number;
  phases: string[];
}

export interface DetectedZone {
  buildingCode: string | null;
  name: string;
  floorNumber: number | null;
  zoneType: 'interior' | 'exterior' | 'common' | 'foundation' | 'site' | 'parkade' | 'roof' | 'elevator' | 'stairs';
  scheduleType: 'interior' | 'exterior' | 'foundation' | 'civil' | 'procurement' | 'other';
  rawArea: string;
  /** Unique key: buildingCode + scheduleType + area — ensures "1st Floor, 1A" in SE vs N are distinct */
  uniqueKey: string;
}

export interface ImportResult {
  activities: ParsedActivity[];
  relationships: ParsedRelationship[];
  buildings: DetectedBuilding[];
  zones: DetectedZone[];
  companies: Map<string, string>; // name -> color
  errors: { row: number; field: string; error: string }[];
}

// ─── Column Detection ──────────────────────────────────────────

const HEADER_ROW_MARKERS = ['Task ID', 'Task Name', 'Phase Name'];
const RELATIONSHIP_MARKERS = ['Predecessor', 'Successor', 'Relation type'];

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
    const vals: string[] = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell) vals.push(String(cell.v));
    }
    const joined = vals.join('|');
    if (HEADER_ROW_MARKERS.every((m) => joined.includes(m))) {
      return r;
    }
  }
  return -1;
}

// ─── Activity Parsing ──────────────────────────────────────────

export function parseActivities(workbook: XLSX.WorkBook): { activities: ParsedActivity[]; errors: { row: number; field: string; error: string }[] } {
  const sheet = workbook.Sheets['Activities'];
  if (!sheet) throw new Error('No "Activities" sheet found in workbook');

  const headerRow = findHeaderRow(sheet);
  if (headerRow === -1) throw new Error('Could not find header row in Activities sheet');

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  // Map column indices
  const colMap: Record<string, number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell) colMap[String(cell.v).trim()] = c;
  }

  const activities: ParsedActivity[] = [];
  const errors: { row: number; field: string; error: string }[] = [];

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const getVal = (colName: string): string => {
      const c = colMap[colName];
      if (c === undefined) return '';
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v).trim() : '';
    };

    const taskId = getVal('Task ID');
    if (!taskId || taskId === 'Task ID') continue; // skip empty rows or repeated headers

    const phaseName = getVal('Phase Name');

    // Parse takt period
    const taktPeriodRaw = getVal('Takt Period');
    const taktPeriod = taktPeriodRaw ? parseInt(taktPeriodRaw) : null;

    // Parse crew size
    const crewRaw = getVal('Crew Size');
    const crewSize = crewRaw ? parseInt(crewRaw) : null;

    const activity: ParsedActivity = {
      taskId,
      taskName: getVal('Task Name'),
      phaseName,
      taktPeriod: isNaN(taktPeriod as number) ? null : taktPeriod,
      startDate: getVal('Start Date'),
      finishDate: getVal('Finish Date'),
      status: getVal('Status'),
      crewSize: isNaN(crewSize as number) ? null : crewSize,
      description: getVal('Description'),
      area: getVal('Area'),
      color: getVal('Color #'),
      predecessors: getVal('Predecessors'),
      taskType: getVal('Task Type'),
      taskCode: getVal('Task Code'),
      company: getVal('Company'),
      companyColor: getVal('Company Color #'),
      tags: getVal('Tags'),
      handoffStatus: getVal('Handoff status'),
      quantity: getVal('Quantity'),
      unit: getVal('Unit'),
    };

    // Validate required fields
    if (!activity.startDate || !activity.finishDate) {
      errors.push({ row: r + 1, field: 'dates', error: 'Missing start or finish date' });
    }

    activities.push(activity);
  }

  return { activities, errors };
}

// ─── Relationship Parsing ──────────────────────────────────────

export function parseRelationships(workbook: XLSX.WorkBook): ParsedRelationship[] {
  const sheet = workbook.Sheets['Relationships'];
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  // Find header row
  let headerRow = -1;
  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    const vals: string[] = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, 10); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell) vals.push(String(cell.v));
    }
    if (RELATIONSHIP_MARKERS.every((m) => vals.some((v) => v.includes(m)))) {
      headerRow = r;
      break;
    }
  }

  if (headerRow === -1) return [];

  const colMap: Record<string, number> = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (cell) colMap[String(cell.v).trim()] = c;
  }

  const relationships: ParsedRelationship[] = [];

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const getVal = (colName: string): string => {
      const c = colMap[colName];
      if (c === undefined) return '';
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      return cell ? String(cell.v).trim() : '';
    };

    const predecessorId = getVal('Predecessor');
    const successorId = getVal('Successor');
    if (!predecessorId || !successorId) continue;

    const relType = getVal('Relation type') as 'FS' | 'SS' | 'FF' | 'SF';
    const lagRaw = getVal('Lag');
    // Parse lag like "0 work hours" or "-8 work hours"
    const lagMatch = lagRaw.match(/([-\d.]+)\s*work\s*hours?/i);
    const lagHours = lagMatch ? parseFloat(lagMatch[1]) : 0;

    relationships.push({
      predecessorId,
      successorId,
      relationType: ['FS', 'SS', 'FF', 'SF'].includes(relType) ? relType : 'FS',
      lagHours,
    });
  }

  return relationships;
}

// ─── Building Detection ────────────────────────────────────────

const BUILDING_PHASE_PATTERNS: Record<string, RegExp> = {
  SE: /^SE\s+Building/i,
  N: /^N\s+Building/i,
  SW: /^SW\s+Building/i,
};

export function detectBuildings(activities: ParsedActivity[]): DetectedBuilding[] {
  const phaseSet = new Set(activities.map((a) => a.phaseName).filter(Boolean));
  const buildingMap = new Map<string, { name: string; phases: Set<string>; floors: Set<number> }>();

  for (const phase of phaseSet) {
    for (const [code, pattern] of Object.entries(BUILDING_PHASE_PATTERNS)) {
      if (pattern.test(phase)) {
        if (!buildingMap.has(code)) {
          buildingMap.set(code, {
            name: `${code} Building`,
            phases: new Set(),
            floors: new Set(),
          });
        }
        buildingMap.get(code)!.phases.add(phase);
      }
    }
  }

  // Detect floors from areas
  for (const activity of activities) {
    if (!activity.area) continue;
    const floorMatch = activity.area.match(/(\d+)(?:st|nd|rd|th)\s+Floor/i);
    if (floorMatch) {
      const floorNum = parseInt(floorMatch[1]);
      // Figure out which building based on phase
      for (const [code, pattern] of Object.entries(BUILDING_PHASE_PATTERNS)) {
        if (pattern.test(activity.phaseName) && buildingMap.has(code)) {
          buildingMap.get(code)!.floors.add(floorNum);
        }
      }
    }

    // Also check area prefix for exterior zones
    const areaPrefix = activity.area.split(',')[0]?.trim();
    if (areaPrefix && buildingMap.has(areaPrefix)) {
      // This is an exterior zone for this building
    }
  }

  return Array.from(buildingMap.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    numFloors: data.floors.size > 0 ? Math.max(...data.floors) : 4,
    phases: Array.from(data.phases),
  }));
}

// ─── Zone Detection ────────────────────────────────────────────

export function detectZones(activities: ParsedActivity[]): DetectedZone[] {
  const zoneMap = new Map<string, DetectedZone>();

  for (const activity of activities) {
    if (!activity.area || activity.area === 'Area' || activity.area === 'Area, Zone') continue;

    const rawArea = activity.area;
    const zone = parseAreaToZone(rawArea, activity.phaseName);
    if (!zone) continue;

    // Use uniqueKey (buildingCode + scheduleType + area) to dedup
    // This ensures "1st Floor, 1A" in SE Building vs N Building are distinct zones
    if (!zoneMap.has(zone.uniqueKey)) {
      zoneMap.set(zone.uniqueKey, zone);
    }
  }

  return Array.from(zoneMap.values());
}

/** Determine schedule type from phase name */
function detectScheduleType(phase: string): DetectedZone['scheduleType'] {
  if (/Interiors?$/i.test(phase)) return 'interior';
  if (/Exteriors?$/i.test(phase)) return 'exterior';
  if (/Foundation/i.test(phase)) return 'foundation';
  if (/Civil/i.test(phase)) return 'civil';
  if (/Procurement/i.test(phase)) return 'procurement';
  return 'other';
}

function parseAreaToZone(area: string, phaseName: string): DetectedZone | null {
  const buildingCode = detectBuildingFromPhase(phaseName);
  const scheduleType = detectScheduleType(phaseName);
  const makeKey = (bCode: string | null, sType: string, a: string) =>
    `${bCode || 'SITE'}::${sType}::${a}`;

  // Interior zones: "1st Floor, 1A" or "4th Floor, Hallway"
  const interiorMatch = area.match(/^(\d+)(?:st|nd|rd|th)\s+Floor,\s*(.+)$/i);
  if (interiorMatch) {
    const floorNum = parseInt(interiorMatch[1]);
    const zoneName = interiorMatch[2].trim();
    return {
      buildingCode,
      name: zoneName,
      floorNumber: floorNum,
      zoneType: zoneName.toLowerCase() === 'hallway' ? 'common' : 'interior',
      scheduleType,
      rawArea: area,
      uniqueKey: makeKey(buildingCode, scheduleType, area),
    };
  }

  // Exterior zones: "SE, 9 (5PK)" or "N, ALL BUILDING"
  const exteriorMatch = area.match(/^(SE|N|SW),\s*(.+)$/);
  if (exteriorMatch) {
    const extBuildingCode = exteriorMatch[1];
    const zoneName = exteriorMatch[2].trim();

    const floorMatch = zoneName.match(/^FLOOR\s+(\d+)$/i);
    if (floorMatch) {
      return {
        buildingCode: extBuildingCode,
        name: zoneName,
        floorNumber: parseInt(floorMatch[1]),
        zoneType: 'exterior',
        scheduleType: 'exterior',
        rawArea: area,
        uniqueKey: makeKey(extBuildingCode, 'exterior', area),
      };
    }

    return {
      buildingCode: extBuildingCode,
      name: zoneName,
      floorNumber: null,
      zoneType: zoneName === 'ALL BUILDING' ? 'common' : 'exterior',
      scheduleType: 'exterior',
      rawArea: area,
      uniqueKey: makeKey(extBuildingCode, 'exterior', area),
    };
  }

  // Foundation zones: "N Building, Foundations 1"
  const foundationMatch = area.match(/^(SE|N|SW)\s+Building,\s*(.+)$/i);
  if (foundationMatch) {
    const fBuildingCode = foundationMatch[1].toUpperCase();
    const zoneName = foundationMatch[2].trim();
    const isFoundation = /foundation/i.test(zoneName);
    return {
      buildingCode: fBuildingCode,
      name: zoneName,
      floorNumber: null,
      zoneType: isFoundation ? 'foundation' : 'common',
      scheduleType: 'foundation',
      rawArea: area,
      uniqueKey: makeKey(fBuildingCode, 'foundation', area),
    };
  }

  // Site zones: "Site SE, General" or "Site North, Zone 1"
  const siteMatch = area.match(/^Site\s+(\w+),\s*(.+)$/i);
  if (siteMatch) {
    return {
      buildingCode: null,
      name: `${siteMatch[1]} - ${siteMatch[2].trim()}`,
      floorNumber: null,
      zoneType: 'site',
      scheduleType: 'civil',
      rawArea: area,
      uniqueKey: makeKey(null, 'civil', area),
    };
  }

  // Special zones: Parkade, Roof, Elevator, Stairs
  const specialZones: Record<string, DetectedZone['zoneType']> = {
    parkade: 'parkade',
    roof: 'roof',
    elevator: 'elevator',
    stairs: 'stairs',
  };

  for (const [keyword, type] of Object.entries(specialZones)) {
    if (area.toLowerCase().includes(keyword)) {
      const parts = area.split(',');
      return {
        buildingCode,
        name: parts.length > 1 ? parts[1].trim() : area,
        floorNumber: null,
        zoneType: type,
        scheduleType,
        rawArea: area,
        uniqueKey: makeKey(buildingCode, scheduleType, area),
      };
    }
  }

  // Retaining wall, community building, procurement, etc.
  return {
    buildingCode,
    name: area,
    floorNumber: null,
    zoneType: 'common',
    scheduleType,
    rawArea: area,
    uniqueKey: makeKey(buildingCode, scheduleType, area),
  };
}

function detectBuildingFromPhase(phase: string): string | null {
  if (/^SE\s+Building/i.test(phase)) return 'SE';
  if (/^N\s+Building/i.test(phase)) return 'N';
  if (/^SW\s+Building/i.test(phase) || /^SW\s\s+Building/i.test(phase)) return 'SW';
  return null;
}

// ─── Company Detection ─────────────────────────────────────────

export function detectCompanies(activities: ParsedActivity[]): Map<string, string> {
  const companyMap = new Map<string, string>();
  for (const activity of activities) {
    if (activity.company && activity.company !== 'Company') {
      if (!companyMap.has(activity.company)) {
        companyMap.set(activity.company, activity.companyColor || '');
      }
    }
  }
  return companyMap;
}

// ─── Main Parse Function ───────────────────────────────────────

export function parseInTaktXLSX(buffer: Buffer): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const { activities, errors } = parseActivities(workbook);
  const relationships = parseRelationships(workbook);
  const buildings = detectBuildings(activities);
  const zones = detectZones(activities);
  const companies = detectCompanies(activities);

  return {
    activities,
    relationships,
    buildings,
    zones,
    companies,
    errors,
  };
}

// ─── Status Mapping ────────────────────────────────────────────

export function mapInTaktStatus(inTaktStatus: string): 'not_started' | 'in_progress' | 'completed' {
  switch (inTaktStatus.toLowerCase().trim()) {
    case 'completed':
      return 'completed';
    case 'in progress':
      return 'in_progress';
    default:
      return 'not_started';
  }
}
