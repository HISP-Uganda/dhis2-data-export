export interface ProgramsResponse {
  pager: Pager;
  programs: Program[];
}

export interface Pager {
  page: number;
  total: number;
  pageSize: number;
  pageCount: number;
}

export interface Program {
  name: string;
  id: string;
  programStages: ProgramStage[];
}

export interface ProgramStage {
  programStageDataElements: ProgramStageDataElement[];
  id: string;
}

export interface ProgramStageDataElement {
  dataElement: DataElement;
}

export interface DataElement {
  name: string;
  id: string;
}

export interface EventsResponse {
  events: Events;
}

export interface Events {
  pager: Pager;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  events: Event[];
}

export interface Pager {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface Event {
  event: string;
  status: string;
  program: string;
  programStage: string;
  enrollment: string;
  orgUnit: string;
  occurredAt: string;
  followUp: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  attributeOptionCombo: string;
  attributeCategoryOptions: string;
  completedBy?: string;
  completedAt?: string;
  createdBy: By;
  updatedBy: By;
  dataValues: DataValue[];
  notes: Note[];
  followup: boolean;
  storedBy?: string;
}

export interface By {
  uid: string;
  username: string;
  firstName: string;
  surname: string;
  displayName?: string;
}

export interface DataValue {
  createdAt: string;
  updatedAt: string;
  providedElsewhere: boolean;
  dataElement: string;
  value: string;
  storedBy?: string;
}

export interface Note {
  note: string;
  storedAt: string;
  value: string;
  createdBy: By;
  storedBy: string;
}



export interface OrganisationUnitsResponse {
  organisationUnits: OrganisationUnit[]
}

export interface OrganisationUnit {
  name: string
  parent: Parent
  id: string
  level: number
}

export interface Parent {
  name: string
  parent: Parent2
  id: string
  level: number
}

export interface Parent2 {
  name: string
  parent: Parent3
  id: string
  level: number
}

export interface Parent3 {
  name: string
  parent?: Parent4
  id: string
  level: number
}

export interface Parent4 {
  name: string
  id: string
  level: number
}
