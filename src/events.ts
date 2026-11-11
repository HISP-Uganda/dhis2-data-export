import { fromPairs, isEmpty } from "lodash";
import { Event, OrganisationUnit, Program } from "./types";

/** Finds the selected program and its first stage, throwing if either is missing. */
export function resolveProgramStage(
  programs: Program[],
  programId: string | null | undefined,
) {
  if (isEmpty(programId)) {
    throw new Error("Program not specified");
  }
  const program = programs.find((p) => p.id === programId);
  if (program === undefined) {
    throw new Error("Program not found");
  }
  const programStage = program.programStages[0];
  if (programStage === undefined) {
    throw new Error("Program stage not found");
  }
  return { program, programStage };
}

/** Maps each org unit id to the name of its district (the level-3 ancestor, or itself at level 3). */
export function districtLookup(
  organisationUnits: OrganisationUnit[],
): Record<string, string> {
  return fromPairs(organisationUnits.map((ou) => [ou.id, districtName(ou)]));
}

export function facilityLookup(
  organisationUnits: OrganisationUnit[],
): Record<string, string> {
  return fromPairs(organisationUnits.map((ou) => [ou.id, ou.name]));
}

/** How many parents to climb from an org unit at a given level to reach its district (level 3). */
const STEPS_TO_DISTRICT: Record<number, number> = {
  3: 0,
  4: 1,
  5: 2,
  6: 3,
  7: 4,
};

type OrgUnitNode = { name: string; parent?: OrgUnitNode };

function districtName(ou: OrganisationUnit): string {
  const steps = STEPS_TO_DISTRICT[ou.level];
  if (steps === undefined) return "";
  let unit: OrgUnitNode = ou;
  for (let i = 0; i < steps; i++) unit = unit.parent!;
  return unit.name;
}

export function buildEventParams({
  programId,
  programStageId,
  page,
  pageSize,
  startDate,
  endDate,
}: {
  programId: string;
  programStageId: string;
  page?: number;
  pageSize?: number;
  startDate?: string | null;
  endDate?: string | null;
}): Record<string, any> {
  return {
    programStage: programStageId,
    page,
    pageSize,
    totalPages: true,
    order: "createdAt",
    includeAllDataElements: true,
    attributeCc: "UjXPudXlraY",
    attributeCos: "l4UMmqvSBe5",
    program: programId,
    ...(startDate && endDate
      ? { occurredAfter: startDate, occurredBefore: endDate }
      : {}),
  };
}

/**
 * Splits an event into its plain fields (minus audit/notes fields) and its
 * data values keyed by `keyFor(dataElementId)`.
 */
export function splitEvent(
  {
    dataValues,
    completedBy,
    storedBy,
    updatedBy,
    createdBy,
    notes,
    ...rest
  }: Event,
  keyFor: (dataElementId: string) => string,
) {
  return {
    rest,
    values: fromPairs(
      dataValues.map((dv) => [keyFor(dv.dataElement), dv.value]),
    ),
  };
}
