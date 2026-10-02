// Extra gallery fixtures (dev only): the passport details card, all valid and with a warning, and the
// pre-payment states (details still being collected, and the final review with Confirm & pay unlocked).
import type { CaseState, DocumentsCardData, IdentityCardData, PriceCardData } from "@/lib/atlas/types";
import { documentsCard, provideInput, quote, sandboxIdentities, saveIdentities } from "@/lib/atlas/engine";
import { applyProfile } from "@/lib/atlas/profile";
import { SANDBOX_INVESTOR_DOCS } from "@/lib/atlas/personas";
import { stateUnpaid } from "./fixtures";

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

/** The tracker's "Waiting on you" list before payment, as the server words it: every detail comes before paying. */
export const waitingBeforePay: string[] = [
  "Approve the Hub71 eligibility letter application",
  "Passport details for Meera Iyer, Arjun Rao, Rohan (spouse) and Anya (child)",
  "When does Meera Iyer first land in the UAE? ADGM needs one entry before incorporation",
  "Are the marriage certificate for Rohan (spouse) and the birth certificate for Anya (child) legalised for the UAE? Dependant visas need them",
  "For the bank file: the source of funds and the ownership chain",
];

/** Routely halfway: the Hub71 OK and passports are in; the landing date, certificates and bank facts aren't. */
export const stateCollecting: CaseState = (() => {
  const s = provideInput(stateUnpaid, "consent:hub71_letter", "Yes, apply for me").state;
  return saveIdentities(s, sandboxIdentities(s)).state;
})();

/** Routely with every detail payment needs: the final review, with Confirm & pay unlocked. */
export const stateReadyToPay: CaseState = (() => {
  let s = provideInput(stateCollecting, "entry:Meera", "Landing 2026-10-09").state;
  s = provideInput(s, "documents:all", "Not yet").state;
  return applyProfile(s, {
    fundingSource: "$600k from 8 angel investors through convertible notes in Routely, a DPIIT-recognised Bangalore company",
    ownership: "Routely will own 100% of the ADGM company; Meera holds 55% and Arjun 45% of Routely",
  }).state;
})();

/** Routely's current quote, so the pre-payment price cards match the live case (not "out of date"). */
export const priceCardLive: PriceCardData = quote(stateUnpaid)!;

/** Meera's uploaded investor documents, as the card shows them. */
export const documentsCardRoutely: DocumentsCardData = documentsCard(SANDBOX_INVESTOR_DOCS.routely!);
