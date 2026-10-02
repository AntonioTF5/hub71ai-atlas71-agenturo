// Extra gallery fixtures (dev only): the passport details card, all valid and with a warning.
import type { IdentityCardData } from "@/lib/atlas/types";

const USED_FOR = [
  "ADGM Registration Authority: shareholders and directors",
  "ADGM Government Services and ICP: entry permits, residence visas and Emirates IDs",
  "SEHA: medical fitness tests",
  "Wio Business: account opening checks",
];

export const identityCardOk: IdentityCardData = {
  people: [
    {
      subjectId: "p-meera-iyer",
      who: "Meera Iyer",
      fullName: "Meera Iyer",
      nationality: "Indian",
      passportLast4: "4821",
      dateOfBirth: "1989-04-17",
      passportExpiry: "2031-08-30",
      sex: "F",
      source: "sandbox",
      validMonths: 58,
      ok: true,
    },
    {
      subjectId: "d-rohan",
      who: "Rohan",
      fullName: "Rohan Iyer",
      nationality: "Indian",
      passportLast4: "7310",
      dateOfBirth: "1987-11-02",
      passportExpiry: "2030-03-14",
      sex: "M",
      source: "sandbox",
      validMonths: 41,
      ok: true,
    },
    {
      subjectId: "d-anya",
      who: "Anya",
      fullName: "Anya Iyer",
      nationality: "Indian",
      passportLast4: "0952",
      dateOfBirth: "2020-06-21",
      passportExpiry: "2029-06-20",
      sex: "F",
      source: "sandbox",
      validMonths: 32,
      ok: true,
    },
  ],
  missing: [],
  usedFor: USED_FOR,
  sandbox: true,
};

export const identityCardWarning: IdentityCardData = {
  people: [
    identityCardOk.people[0],
    {
      subjectId: "d-rohan",
      who: "Rohan",
      fullName: "Rohan Iyer",
      nationality: "Indian",
      passportLast4: "7310",
      dateOfBirth: "1987-11-02",
      passportExpiry: "2027-01-12",
      sex: "M",
      source: "document",
      validMonths: 3,
      ok: false,
      note: "Passport must be valid for 6+ months for a residence visa; renew it first.",
    },
  ],
  missing: ["Anya", "Arjun Rao"],
  usedFor: USED_FOR,
  sandbox: true,
};

/** The tracker's "Waiting on you" list before payment, as the server now words it. */
export const waitingBeforePay: string[] = [
  "Approve the Hub71 eligibility letter application",
  "Passport details for Meera Iyer, Arjun Rao, Rohan and Anya",
  "Confirm and pay AED 40,075 to start filing",
];
