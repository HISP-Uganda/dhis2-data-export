import {
	buildEventParams,
	districtLookup,
	resolveProgramStage,
	splitEvent,
} from "./events";
import { Event, OrganisationUnit, Program } from "./types";

describe("resolveProgramStage", () => {
	const stage = { id: "S", programStageDataElements: [] };
	const programs: Program[] = [
		{ id: "P", name: "With stage", programStages: [stage] },
		{ id: "E", name: "No stages", programStages: [] },
	];

	it("returns the program and its first stage", () => {
		expect(resolveProgramStage(programs, "P")).toEqual({
			program: programs[0],
			programStage: stage,
		});
	});

	it.each([
		[undefined, "Program not specified"],
		["missing", "Program not found"],
		["E", "Program stage not found"],
	])("throws for %p", (id, message) => {
		expect(() => resolveProgramStage(programs, id)).toThrow(message);
	});
});

const district = { name: "Kampala", id: "d", level: 3 } as any;
const subcounty = { name: "Central", id: "s", level: 4, parent: district } as any;
const parish = { name: "Nakasero", id: "p", level: 5, parent: subcounty } as any;

describe("districtLookup", () => {
	it("resolves each org unit level to its district name", () => {
		const units = [
			{ ...district, id: "l3" },
			{ ...subcounty, id: "l4" },
			{ ...parish, id: "l5" },
			{ name: "HC", id: "l6", level: 6, parent: parish },
			{ name: "Uganda", id: "l1", level: 1 },
		] as OrganisationUnit[];
		expect(districtLookup(units)).toEqual({
			l3: "Kampala",
			l4: "Kampala",
			l5: "Kampala",
			l6: "Kampala",
			l1: "",
		});
	});
});

describe("buildEventParams", () => {
	const base = { programId: "P", programStageId: "S", page: 2, pageSize: 50 };

	it("omits the date range unless both dates are set", () => {
		expect(buildEventParams({ ...base, startDate: "2024-01-01" })).not.toHaveProperty(
			"occurredAfter",
		);
	});

	it("adds the date range when both dates are set", () => {
		expect(
			buildEventParams({ ...base, startDate: "2024-01-01", endDate: "2024-02-01" }),
		).toMatchObject({
			program: "P",
			programStage: "S",
			page: 2,
			pageSize: 50,
			occurredAfter: "2024-01-01",
			occurredBefore: "2024-02-01",
		});
	});
});

describe("splitEvent", () => {
	it("drops audit fields and keys data values with keyFor", () => {
		const event = {
			event: "e1",
			orgUnit: "ou1",
			dataValues: [{ dataElement: "de1", value: "42" }],
			completedBy: "x",
			storedBy: "x",
			updatedBy: {},
			createdBy: {},
			notes: [],
		} as unknown as Event;
		const { rest, values } = splitEvent(event, (id) => `name:${id}`);
		expect(rest).toEqual({ event: "e1", orgUnit: "ou1" });
		expect(values).toEqual({ "name:de1": "42" });
	});
});
