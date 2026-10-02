// Demo personas (fictional founders) and the empty case every chat starts from.
import type { CaseState, Profile } from "./types";

export type PersonaId = "routely" | "byteforge";

export interface Persona {
  id: PersonaId;
  name: string;
  tagline: string;
  founder: string; // name and title, for the persona card
  founderName: string; // exactly as the founder introduces themselves; used by sign-in, header and checkout
  email: string; // the fictional account shown in the sandbox sign-in and checkout
  opener: string; // sent as the founder's first message
}

export const PERSONAS: Persona[] = [
  {
    id: "routely",
    name: "Routely",
    tagline: "B2B SaaS · Bangalore · moving with family",
    founder: "Meera Iyer, CEO",
    founderName: "Meera Iyer",
    email: "meera@routely.io",
    opener:
      "Hi, I'm Meera Iyer, CEO of Routely (routely.io). We sell route-planning software to delivery fleets: a web app for dispatchers and a mobile app for drivers, on monthly subscriptions, to logistics companies in India and the Gulf. " +
      "We're a seed-stage startup based in Bangalore, and we've raised $600k. " +
      "I'm moving to Abu Dhabi with my husband Rohan and our daughter Anya, who's 6. My co-founder Arjun Rao is our CTO. " +
      "We expect around $40k a month in customer payments, from the UAE, Saudi Arabia and India.",
  },
  {
    id: "byteforge",
    name: "Byteforge",
    tagline: "Dev agency · Cairo · 4 people moving",
    founder: "Omar Farouk, founder",
    founderName: "Omar Farouk",
    email: "omar@byteforge.dev",
    opener:
      "Hello, I'm Omar Farouk, founder of Byteforge (byteforge.dev). We're a 25-person software development agency in Cairo: we build custom web and mobile apps for clients in Egypt, the Gulf and Europe, billed per project. " +
      "Four of us are moving to Abu Dhabi to open a regional office: me, our CTO Laila Mansour, and two senior engineers, Karim Adel and Nour Hassan. " +
      "No families are moving for now, and we don't have a Hub71 letter.",
  },
];

/** Fictional saved passports for the sandbox fast-track ("use my saved passports"), matched by first name. */
export interface SandboxPassport {
  firstName: string;
  fullName: string;
  nationality: string;
  passportLast4: string;
  dateOfBirth: string;
  passportExpiry: string;
  sex: "F" | "M";
}

export const SANDBOX_PASSPORTS: Record<PersonaId, SandboxPassport[]> = {
  routely: [
    { firstName: "Meera", fullName: "Meera Iyer", nationality: "Indian", passportLast4: "4821", dateOfBirth: "1990-04-12", passportExpiry: "2033-06-30", sex: "F" },
    { firstName: "Arjun", fullName: "Arjun Rao", nationality: "Indian", passportLast4: "7735", dateOfBirth: "1989-11-03", passportExpiry: "2031-02-14", sex: "M" },
    { firstName: "Rohan", fullName: "Rohan Iyer", nationality: "Indian", passportLast4: "1290", dateOfBirth: "1988-08-21", passportExpiry: "2030-09-09", sex: "M" },
    { firstName: "Anya", fullName: "Anya Iyer", nationality: "Indian", passportLast4: "5604", dateOfBirth: "2020-03-15", passportExpiry: "2029-03-01", sex: "F" },
  ],
  byteforge: [
    { firstName: "Omar", fullName: "Omar Farouk", nationality: "Egyptian", passportLast4: "3318", dateOfBirth: "1987-01-09", passportExpiry: "2032-05-18", sex: "M" },
    { firstName: "Laila", fullName: "Laila Mansour", nationality: "Egyptian", passportLast4: "9047", dateOfBirth: "1991-07-22", passportExpiry: "2031-11-02", sex: "F" },
    { firstName: "Karim", fullName: "Karim Adel", nationality: "Egyptian", passportLast4: "2563", dateOfBirth: "1993-02-02", passportExpiry: "2030-12-12", sex: "M" },
    { firstName: "Nour", fullName: "Nour Hassan", nationality: "Egyptian", passportLast4: "6871", dateOfBirth: "1994-10-30", passportExpiry: "2033-01-25", sex: "F" },
  ],
};

export function emptyProfile(): Profile {
  return {
    company: null,
    description: null,
    website: null,
    homeBase: null,
    stage: null,
    fundingUsd: null,
    fundingSource: null,
    parentEntity: null,
    ownership: null,
    hub71Letter: null,
    sellsOnshoreUAE: null,
    monthlyVolumeUsd: null,
    transactionCountries: null,
    people: [],
    dependants: [],
  };
}

export function emptyCase(startDate: string, persona: CaseState["persona"] = null): CaseState {
  return {
    v: 1,
    persona,
    startDate,
    today: startDate,
    profile: emptyProfile(),
    fit: null,
    route: null,
    paid: null,
    filings: [],
    events: [],
    bankFile: null,
    inputs: {},
  };
}
