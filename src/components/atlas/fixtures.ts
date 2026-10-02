// Realistic fixtures for every card kind, the tracker and a sample conversation (dev gallery only).
// Generated from the real engine over the Routely and Byteforge cases; the bank file is hand-written.
import type {
  BankFileCardData,
  CheckoutCardData,
  CompareCardData,
  CaseState,
  FilingsCardData,
  PlanCardData,
  PriceCardData,
  RouteCardData,
  UpdatesCardData,
} from "@/lib/atlas/types";
import type { UiMessage } from "./session";

export const FIX_START = "2026-10-02";

export const routeCard: RouteCardData = {
  "recommended": {
    "id": "adgm_tsl",
    "name": "ADGM Tech Startup Licence",
    "summary": "ADGM's licence for tech startups, under English common law. It's incentivised for up to 3 years, needs a Hub71 eligibility letter, and gives 3 visas per dedicated desk.",
    "licenceAed": 6611
  },
  "reasons": [
    "You sell your own technology product, which is what the Tech Startup Licence is for [source:adgm-tsl].",
    "It's the lowest ADGM licence fee, AED 6,611 in year one, and it's incentivised for up to 3 years [source:adgm-fees].",
    "You stay under English common law, with 3 visas for each dedicated desk [source:adgm-tsl]."
  ],
  "prerequisites": [
    {
      "label": "Hub71 eligibility letter",
      "state": "missing",
      "note": "Atlas71 files it [source:hub71-tsl]."
    },
    {
      "label": "Dedicated desk",
      "state": "missing",
      "note": "Required: AED 13,800 a year each, 3 visas per desk; hot desks don't count. Atlas71 books it [source:adgm-faq]."
    },
    {
      "label": "Ownership review",
      "state": "review",
      "note": "ADGM and the bank need the parent's certificate of incorporation and shareholder register."
    }
  ],
  "alternatives": [
    {
      "id": "adgm_standard",
      "name": "ADGM licence (non-financial)",
      "why": "The fallback if the Hub71 letter doesn't come through: any non-financial activity, the same desk rule, a higher licence fee.",
      "licenceAed": 21301
    },
    {
      "id": "masdar",
      "name": "Masdar City Free Zone · Innovation",
      "why": "AED 7,811 less on licence and desk, with a flexi desk included. 2 visas included, with visa fees quoted by the free zone. UAE civil law instead of common law.",
      "licenceAed": 12600
    }
  ],
  "checks": [
    {
      "key": "tech_product",
      "label": "Sells its own tech product",
      "p": 0.94,
      "verdict": "pass"
    },
    {
      "key": "service_provider",
      "label": "Technology service provider",
      "p": 0.07,
      "verdict": "pass"
    },
    {
      "key": "regulated_finance",
      "label": "Regulated financial activity",
      "p": 0.03,
      "verdict": "pass"
    },
    {
      "key": "excluded_sector",
      "label": "Retail, manufacturing or gaming",
      "p": 0.04,
      "verdict": "pass"
    },
    {
      "key": "scalable",
      "label": "Scalable technology",
      "p": 0.91,
      "verdict": "pass"
    }
  ],
  "checksMeta": {
    "live": true,
    "latencyMs": 312,
    "model": "jev-1"
  },
  "sources": [
    {
      "id": "adgm-tsl",
      "title": "ADGM · Tech Startup Licence",
      "url": "https://www.adgm.com/business-areas/tech-startup"
    },
    {
      "id": "adgm-fees",
      "title": "ADGM · Schedule of fees 2025",
      "url": "https://assets.adgm.com/download/assets/Schedule+of+Fees+2025.pdf/6f25a452823d11ef808c3e0446867bce"
    },
    {
      "id": "hub71-tsl",
      "title": "Hub71 · FAQs",
      "url": "https://www.hub71.com/faqs"
    },
    {
      "id": "adgm-faq",
      "title": "ADGM · Setting up FAQ",
      "url": "https://www.adgm.com/faqs/setting-up"
    },
    {
      "id": "masdar",
      "title": "Masdar City Free Zone · Licences",
      "url": "https://masdarcityfreezone.com/explore/license-and-registration"
    }
  ]
};

export const routeCardByteforge: RouteCardData = {
  "recommended": {
    "id": "adgm_standard",
    "name": "ADGM licence (non-financial)",
    "summary": "A standard ADGM non-financial licence, under English common law. Any lawful non-financial activity, including technology services, with 3 visas per dedicated desk.",
    "licenceAed": 21301
  },
  "reasons": [
    "The startup licence isn't for technology service providers [source:adgm-tsl].",
    "A standard ADGM non-financial licence covers the activity, under English common law [source:adgm-fees].",
    "Masdar City Free Zone is the cheaper alternative, with a flexi desk included [source:masdar]."
  ],
  "prerequisites": [
    {
      "label": "2 dedicated desks",
      "state": "missing",
      "note": "Required: AED 13,800 a year each, 3 visas per desk; hot desks don't count. Atlas71 books it [source:adgm-faq]."
    }
  ],
  "alternatives": [
    {
      "id": "masdar",
      "name": "Masdar City Free Zone · Innovation",
      "why": "AED 36,301 less on licence and desks, with a flexi desk included. 2 visas included; moving 4 people needs a bigger package, quoted by the free zone. UAE civil law instead of common law.",
      "licenceAed": 12600
    }
  ],
  "checks": [
    {
      "key": "tech_product",
      "label": "Sells its own tech product",
      "p": 0.18,
      "verdict": "flag",
      "note": "Reads as client work rather than an own product."
    },
    {
      "key": "service_provider",
      "label": "Technology service provider",
      "p": 0.93,
      "verdict": "flag",
      "note": "The startup licence isn't for technology service providers [source:adgm-tsl]."
    },
    {
      "key": "regulated_finance",
      "label": "Regulated financial activity",
      "p": 0.02,
      "verdict": "pass"
    },
    {
      "key": "excluded_sector",
      "label": "Retail, manufacturing or gaming",
      "p": 0.05,
      "verdict": "pass"
    },
    {
      "key": "scalable",
      "label": "Scalable technology",
      "p": 0.58,
      "verdict": "review"
    }
  ],
  "checksMeta": {
    "live": true,
    "latencyMs": 287,
    "model": "jev-1"
  },
  "sources": [
    {
      "id": "adgm-fees",
      "title": "ADGM · Schedule of fees 2025",
      "url": "https://assets.adgm.com/download/assets/Schedule+of+Fees+2025.pdf/6f25a452823d11ef808c3e0446867bce"
    },
    {
      "id": "adgm-faq",
      "title": "ADGM · Setting up FAQ",
      "url": "https://www.adgm.com/faqs/setting-up"
    },
    {
      "id": "masdar",
      "title": "Masdar City Free Zone · Licences",
      "url": "https://masdarcityfreezone.com/explore/license-and-registration"
    }
  ]
};

export const routeCardSpecialist: RouteCardData = {
  "recommended": {
    "id": "specialist",
    "name": "Specialist review",
    "summary": "Regulated financial activity needs an FSRA or Central Bank licence. A licensing specialist reviews the case before anything is filed."
  },
  "reasons": [
    "The activity looks like regulated finance (payments, lending, investment, insurance or crypto). That needs an FSRA or Central Bank licence, which is outside this demo, so a specialist takes it from here."
  ],
  "prerequisites": [],
  "alternatives": [],
  "checks": [
    {
      "key": "tech_product",
      "label": "Sells its own tech product",
      "p": 0.81,
      "verdict": "pass"
    },
    {
      "key": "service_provider",
      "label": "Technology service provider",
      "p": 0.12,
      "verdict": "pass"
    },
    {
      "key": "regulated_finance",
      "label": "Regulated financial activity",
      "p": 0.91,
      "verdict": "flag",
      "note": "Needs an FSRA or Central Bank licence: specialist review."
    },
    {
      "key": "excluded_sector",
      "label": "Retail, manufacturing or gaming",
      "p": 0.06,
      "verdict": "pass"
    },
    {
      "key": "scalable",
      "label": "Scalable technology",
      "p": 0.84,
      "verdict": "pass"
    }
  ],
  "checksMeta": {
    "live": true,
    "latencyMs": 296,
    "model": "jev-1"
  },
  "sources": []
};

export const routeCardUnavailable: RouteCardData = {
  "recommended": {
    "id": "specialist",
    "name": "Route check paused",
    "summary": "The AI eligibility check didn't answer, so Atlas71 hasn't picked a route yet."
  },
  "reasons": [],
  "prerequisites": [],
  "alternatives": [],
  "checks": [],
  "checksMeta": {
    "live": false,
    "error": "unavailable"
  },
  "sources": []
};

export const routeCardSetup: RouteCardData = {
  "recommended": {
    "id": "specialist",
    "name": "Route check paused",
    "summary": "The AI eligibility check didn't answer, so Atlas71 hasn't picked a route yet."
  },
  "reasons": [],
  "prerequisites": [],
  "alternatives": [],
  "checks": [],
  "checksMeta": {
    "live": false,
    "error": "setup_required"
  },
  "sources": []
};

export const planCard: PlanCardData = {
  "routeName": "ADGM Tech Startup Licence",
  "today": "2026-10-02",
  "milestones": [
    {
      "key": "licensed",
      "label": "Licensed",
      "best": "2026-10-21",
      "typical": "2026-11-13"
    },
    {
      "key": "resident",
      "label": "Resident",
      "best": "2026-11-01",
      "typical": "2026-12-17"
    },
    {
      "key": "banked",
      "label": "Banked",
      "best": "2026-11-04",
      "typical": "2027-01-01"
    },
    {
      "key": "payments",
      "label": "Payments live",
      "best": "2026-11-05",
      "typical": "2027-01-04"
    }
  ],
  "groups": [
    {
      "label": "Company",
      "steps": [
        {
          "id": "hub71_letter",
          "step": "hub71_letter",
          "title": "Hub71 eligibility letter",
          "provider": "Hub71",
          "status": "ready",
          "best": [
            "2026-10-02",
            "2026-10-16"
          ],
          "typical": [
            "2026-10-02",
            "2026-10-30"
          ],
          "note": "Separate from the selective Access programme."
        },
        {
          "id": "desk",
          "step": "desk",
          "title": "Dedicated desk lease",
          "provider": "ADGM-zone coworking",
          "status": "ready",
          "best": [
            "2026-10-02",
            "2026-10-03"
          ],
          "typical": [
            "2026-10-02",
            "2026-10-09"
          ],
          "feeAed": 13800,
          "note": "1 desk for 1 visa (3 per desk). ADGM needs a dedicated desk; hot desks don't count."
        },
        {
          "id": "incorporation",
          "step": "incorporation",
          "title": "Incorporation + commercial licence",
          "provider": "ADGM Registration Authority",
          "status": "locked",
          "best": [
            "2026-10-16",
            "2026-10-21"
          ],
          "typical": [
            "2026-10-30",
            "2026-11-13"
          ],
          "feeAed": 6611,
          "note": "Within 10 business days of a complete file."
        },
        {
          "id": "establishment_card",
          "step": "establishment_card",
          "title": "Establishment card + e-Channels",
          "provider": "ADGM Government Services",
          "status": "locked",
          "best": [
            "2026-10-21",
            "2026-10-26"
          ],
          "typical": [
            "2026-11-13",
            "2026-11-27"
          ],
          "feeAed": 5325
        }
      ]
    },
    {
      "label": "People",
      "steps": [
        {
          "id": "entry_permit:p-meera-iyer",
          "step": "entry_permit",
          "title": "Entry permit + work permit",
          "who": "Meera Iyer",
          "provider": "ADGM GS → ICP",
          "status": "locked",
          "best": [
            "2026-10-26",
            "2026-10-28"
          ],
          "typical": [
            "2026-11-27",
            "2026-12-04"
          ],
          "feeAed": 3237
        },
        {
          "id": "medical:p-meera-iyer",
          "step": "medical",
          "title": "Medical fitness test",
          "who": "Meera Iyer",
          "provider": "SEHA",
          "status": "locked",
          "best": [
            "2026-10-28",
            "2026-10-29"
          ],
          "typical": [
            "2026-12-04",
            "2026-12-07"
          ],
          "feeAed": 300
        },
        {
          "id": "emirates_id:p-meera-iyer",
          "step": "emirates_id",
          "title": "Biometrics, Emirates ID + residence visa",
          "who": "Meera Iyer",
          "provider": "ICP",
          "status": "locked",
          "best": [
            "2026-10-29",
            "2026-11-01"
          ],
          "typical": [
            "2026-12-07",
            "2026-12-17"
          ],
          "feeAed": 300
        },
        {
          "id": "dependant_visa:d-rohan",
          "step": "dependant_visa",
          "title": "Dependant residence visa",
          "who": "Rohan (spouse)",
          "provider": "ICP",
          "status": "locked",
          "best": [
            "2026-11-01",
            "2026-11-08"
          ],
          "typical": [
            "2026-12-17",
            "2027-01-07"
          ],
          "feeAed": 3207,
          "note": "Needs a legalised marriage or birth certificate. The UAE isn't in the Apostille Convention, so start early."
        },
        {
          "id": "dependant_visa:d-anya",
          "step": "dependant_visa",
          "title": "Dependant residence visa",
          "who": "Anya (child)",
          "provider": "ICP",
          "status": "locked",
          "best": [
            "2026-11-01",
            "2026-11-08"
          ],
          "typical": [
            "2026-12-17",
            "2027-01-07"
          ],
          "feeAed": 2395,
          "note": "Needs a legalised marriage or birth certificate. The UAE isn't in the Apostille Convention, so start early."
        }
      ]
    },
    {
      "label": "Money & tax",
      "steps": [
        {
          "id": "tax_registration",
          "step": "tax_registration",
          "title": "Corporate tax registration",
          "provider": "FTA · EmaraTax",
          "status": "locked",
          "best": [
            "2026-10-21",
            "2026-10-24"
          ],
          "typical": [
            "2026-11-13",
            "2026-12-03"
          ],
          "note": "Due within 3 months of incorporation; AED 10,000 penalty if late."
        },
        {
          "id": "bank_file",
          "step": "bank_file",
          "title": "Bank file prepared",
          "provider": "Atlas71",
          "status": "locked",
          "best": [
            "2026-10-21",
            "2026-10-21"
          ],
          "typical": [
            "2026-11-13",
            "2026-11-15"
          ],
          "note": "Needs where the company's money came from (who invested, how much, how); the ownership chain from the UAE company up to the people, with percentages."
        },
        {
          "id": "bank_account",
          "step": "bank_account",
          "title": "Business bank account",
          "provider": "Wio Business",
          "status": "locked",
          "best": [
            "2026-11-01",
            "2026-11-04"
          ],
          "typical": [
            "2026-12-17",
            "2027-01-01"
          ],
          "note": "The signatory needs an Emirates ID. Plan from AED 99/month, billed by the bank."
        },
        {
          "id": "payments",
          "step": "payments",
          "title": "Payments live",
          "provider": "Stripe",
          "status": "locked",
          "best": [
            "2026-11-04",
            "2026-11-05"
          ],
          "typical": [
            "2027-01-01",
            "2027-01-04"
          ],
          "note": "Stripe UAE needs the trade licence and a bank statement."
        }
      ]
    }
  ],
  "sources": [
    {
      "id": "adgm-tsl",
      "title": "ADGM · Tech Startup Licence",
      "url": "https://www.adgm.com/business-areas/tech-startup"
    },
    {
      "id": "adgm-fees",
      "title": "ADGM · Schedule of fees 2025",
      "url": "https://assets.adgm.com/download/assets/Schedule+of+Fees+2025.pdf/6f25a452823d11ef808c3e0446867bce"
    },
    {
      "id": "hub71-tsl",
      "title": "Hub71 · FAQs",
      "url": "https://www.hub71.com/faqs"
    },
    {
      "id": "adgm-faq",
      "title": "ADGM · Setting up FAQ",
      "url": "https://www.adgm.com/faqs/setting-up"
    },
    {
      "id": "desk-price",
      "title": "Aegis Coworking · ADGM dedicated desk",
      "url": "https://www.aegiscoworking.ae/blog/adgm-tech-startup-licence-dedicated-desk"
    },
    {
      "id": "adgm-gs-fees",
      "title": "ADGM Government Services · Fee schedule",
      "url": "https://assets.adgm.com/download/assets/GS+Fee+Schedule+19.11.2024.pdf/0924d554643511efb4ba6646cc95a6ef"
    },
    {
      "id": "fta-ct",
      "title": "FTA · Corporate tax registration timeframes",
      "url": "https://tax.gov.ae/en/media.centre/news/federal.tax.authority.issues.new.decision.on.specified.timeframes.for.corporate.tax.registration.aspx"
    },
    {
      "id": "mof-penalty",
      "title": "UAE Ministry of Finance · Late registration penalty",
      "url": "https://mof.gov.ae/en/news/aed10000-penalty-for-late-corporate-tax-registration/"
    },
    {
      "id": "seha-medical",
      "title": "Policybazaar · Medical fitness test",
      "url": "https://www.policybazaar.ae/health-insurance/articles/medical-fitness-test-in-abu-dhabi/"
    },
    {
      "id": "icp-eid",
      "title": "ICP · Emirates ID issuance",
      "url": "https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"
    },
    {
      "id": "apostille",
      "title": "HCCH · Apostille Convention status",
      "url": "https://www.hcch.net/en/instruments/conventions/status-table/?cid=41"
    },
    {
      "id": "wio",
      "title": "Wio Business",
      "url": "https://www.wio.io/business"
    },
    {
      "id": "stripe-uae",
      "title": "Stripe · UAE activation requirements",
      "url": "https://support.stripe.com/questions/uae-account-activation-requirements"
    }
  ]
};

export const planCardLater: PlanCardData = {
  "routeName": "ADGM Tech Startup Licence",
  "today": "2026-10-23",
  "milestones": [
    {
      "key": "licensed",
      "label": "Licensed",
      "best": "2026-10-23",
      "typical": "2026-10-23",
      "doneOn": "2026-10-23"
    },
    {
      "key": "resident",
      "label": "Resident",
      "best": "2026-11-03",
      "typical": "2026-11-26"
    },
    {
      "key": "banked",
      "label": "Banked",
      "best": "2026-11-06",
      "typical": "2026-12-11"
    },
    {
      "key": "payments",
      "label": "Payments live",
      "best": "2026-11-07",
      "typical": "2026-12-14"
    }
  ],
  "groups": [
    {
      "label": "Company",
      "steps": [
        {
          "id": "hub71_letter",
          "step": "hub71_letter",
          "title": "Hub71 eligibility letter",
          "provider": "Hub71",
          "status": "done",
          "best": [
            "2026-10-02",
            "2026-10-16"
          ],
          "typical": [
            "2026-10-02",
            "2026-10-16"
          ],
          "doneOn": "2026-10-16",
          "note": "Separate from the selective Access programme."
        },
        {
          "id": "desk",
          "step": "desk",
          "title": "Dedicated desk lease",
          "provider": "ADGM-zone coworking",
          "status": "done",
          "best": [
            "2026-10-02",
            "2026-10-04"
          ],
          "typical": [
            "2026-10-02",
            "2026-10-04"
          ],
          "doneOn": "2026-10-04",
          "feeAed": 13800,
          "note": "1 desk for 1 visa (3 per desk). ADGM needs a dedicated desk; hot desks don't count."
        },
        {
          "id": "incorporation",
          "step": "incorporation",
          "title": "Incorporation + commercial licence",
          "provider": "ADGM Registration Authority",
          "status": "done",
          "best": [
            "2026-10-16",
            "2026-10-23"
          ],
          "typical": [
            "2026-10-16",
            "2026-10-23"
          ],
          "doneOn": "2026-10-23",
          "feeAed": 6611,
          "note": "Within 10 business days of a complete file."
        },
        {
          "id": "establishment_card",
          "step": "establishment_card",
          "title": "Establishment card + e-Channels",
          "provider": "ADGM Government Services",
          "status": "filed",
          "best": [
            "2026-10-23",
            "2026-10-28"
          ],
          "typical": [
            "2026-10-23",
            "2026-11-06"
          ],
          "feeAed": 5325
        }
      ]
    },
    {
      "label": "People",
      "steps": [
        {
          "id": "entry_permit:p-meera-iyer",
          "step": "entry_permit",
          "title": "Entry permit + work permit",
          "who": "Meera Iyer",
          "provider": "ADGM GS → ICP",
          "status": "locked",
          "best": [
            "2026-10-28",
            "2026-10-30"
          ],
          "typical": [
            "2026-11-06",
            "2026-11-13"
          ],
          "feeAed": 3237
        },
        {
          "id": "medical:p-meera-iyer",
          "step": "medical",
          "title": "Medical fitness test",
          "who": "Meera Iyer",
          "provider": "SEHA",
          "status": "locked",
          "best": [
            "2026-10-30",
            "2026-10-31"
          ],
          "typical": [
            "2026-11-13",
            "2026-11-16"
          ],
          "feeAed": 300,
          "note": "Slot: Sat 24 Oct, 09:00 · SEHA Al Bateen"
        },
        {
          "id": "emirates_id:p-meera-iyer",
          "step": "emirates_id",
          "title": "Biometrics, Emirates ID + residence visa",
          "who": "Meera Iyer",
          "provider": "ICP",
          "status": "locked",
          "best": [
            "2026-10-31",
            "2026-11-03"
          ],
          "typical": [
            "2026-11-16",
            "2026-11-26"
          ],
          "feeAed": 300
        },
        {
          "id": "dependant_visa:d-rohan",
          "step": "dependant_visa",
          "title": "Dependant residence visa",
          "who": "Rohan (spouse)",
          "provider": "ICP",
          "status": "locked",
          "best": [
            "2026-11-03",
            "2026-11-10"
          ],
          "typical": [
            "2026-11-26",
            "2026-12-17"
          ],
          "feeAed": 3207,
          "note": "Needs a legalised marriage or birth certificate. The UAE isn't in the Apostille Convention, so start early."
        },
        {
          "id": "dependant_visa:d-anya",
          "step": "dependant_visa",
          "title": "Dependant residence visa",
          "who": "Anya (child)",
          "provider": "ICP",
          "status": "locked",
          "best": [
            "2026-11-03",
            "2026-11-10"
          ],
          "typical": [
            "2026-11-26",
            "2026-12-17"
          ],
          "feeAed": 2395,
          "note": "Needs a legalised marriage or birth certificate. The UAE isn't in the Apostille Convention, so start early."
        }
      ]
    },
    {
      "label": "Money & tax",
      "steps": [
        {
          "id": "tax_registration",
          "step": "tax_registration",
          "title": "Corporate tax registration",
          "provider": "FTA · EmaraTax",
          "status": "filed",
          "best": [
            "2026-10-23",
            "2026-10-26"
          ],
          "typical": [
            "2026-10-23",
            "2026-11-12"
          ],
          "note": "Due within 3 months of incorporation; AED 10,000 penalty if late.",
          "deadline": "2027-01-23"
        },
        {
          "id": "bank_file",
          "step": "bank_file",
          "title": "Bank file prepared",
          "provider": "Atlas71",
          "status": "needs_input",
          "best": [
            "2026-10-23",
            "2026-10-23"
          ],
          "typical": [
            "2026-10-23",
            "2026-10-25"
          ],
          "note": "Needs where the company's money came from (who invested, how much, how); the ownership chain from the UAE company up to the people, with percentages."
        },
        {
          "id": "bank_account",
          "step": "bank_account",
          "title": "Business bank account",
          "provider": "Wio Business",
          "status": "locked",
          "best": [
            "2026-11-03",
            "2026-11-06"
          ],
          "typical": [
            "2026-11-26",
            "2026-12-11"
          ],
          "note": "The signatory needs an Emirates ID. Plan from AED 99/month, billed by the bank."
        },
        {
          "id": "payments",
          "step": "payments",
          "title": "Payments live",
          "provider": "Stripe",
          "status": "locked",
          "best": [
            "2026-11-06",
            "2026-11-07"
          ],
          "typical": [
            "2026-12-11",
            "2026-12-14"
          ],
          "note": "Stripe UAE needs the trade licence and a bank statement."
        }
      ]
    }
  ],
  "sources": [
    {
      "id": "adgm-tsl",
      "title": "ADGM · Tech Startup Licence",
      "url": "https://www.adgm.com/business-areas/tech-startup"
    },
    {
      "id": "adgm-fees",
      "title": "ADGM · Schedule of fees 2025",
      "url": "https://assets.adgm.com/download/assets/Schedule+of+Fees+2025.pdf/6f25a452823d11ef808c3e0446867bce"
    },
    {
      "id": "hub71-tsl",
      "title": "Hub71 · FAQs",
      "url": "https://www.hub71.com/faqs"
    },
    {
      "id": "adgm-faq",
      "title": "ADGM · Setting up FAQ",
      "url": "https://www.adgm.com/faqs/setting-up"
    },
    {
      "id": "desk-price",
      "title": "Aegis Coworking · ADGM dedicated desk",
      "url": "https://www.aegiscoworking.ae/blog/adgm-tech-startup-licence-dedicated-desk"
    },
    {
      "id": "adgm-gs-fees",
      "title": "ADGM Government Services · Fee schedule",
      "url": "https://assets.adgm.com/download/assets/GS+Fee+Schedule+19.11.2024.pdf/0924d554643511efb4ba6646cc95a6ef"
    },
    {
      "id": "fta-ct",
      "title": "FTA · Corporate tax registration timeframes",
      "url": "https://tax.gov.ae/en/media.centre/news/federal.tax.authority.issues.new.decision.on.specified.timeframes.for.corporate.tax.registration.aspx"
    },
    {
      "id": "mof-penalty",
      "title": "UAE Ministry of Finance · Late registration penalty",
      "url": "https://mof.gov.ae/en/news/aed10000-penalty-for-late-corporate-tax-registration/"
    },
    {
      "id": "seha-medical",
      "title": "Policybazaar · Medical fitness test",
      "url": "https://www.policybazaar.ae/health-insurance/articles/medical-fitness-test-in-abu-dhabi/"
    },
    {
      "id": "icp-eid",
      "title": "ICP · Emirates ID issuance",
      "url": "https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"
    },
    {
      "id": "apostille",
      "title": "HCCH · Apostille Convention status",
      "url": "https://www.hcch.net/en/instruments/conventions/status-table/?cid=41"
    },
    {
      "id": "wio",
      "title": "Wio Business",
      "url": "https://www.wio.io/business"
    },
    {
      "id": "stripe-uae",
      "title": "Stripe · UAE activation requirements",
      "url": "https://support.stripe.com/questions/uae-account-activation-requirements"
    }
  ]
};

export const priceCard: PriceCardData = {
  "routeName": "ADGM Tech Startup Licence",
  "totalAed": 40075,
  "lines": [
    {
      "label": "Atlas71 landing fee",
      "amountAed": 4900,
      "group": "Atlas",
      "sourceId": "atlas-pricing"
    },
    {
      "label": "ADGM Tech Startup Licence, year one",
      "amountAed": 6611,
      "group": "Government",
      "sourceId": "adgm-fees"
    },
    {
      "label": "Establishment card + e-Channels",
      "amountAed": 5325,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Employment visa (2 years)",
      "qty": 1,
      "unitAed": 3237,
      "amountAed": 3237,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Medical test + Emirates ID",
      "qty": 1,
      "unitAed": 600,
      "amountAed": 600,
      "group": "Government",
      "sourceId": "seha-medical"
    },
    {
      "label": "Dependant visa + medical + Emirates ID · adult",
      "qty": 1,
      "unitAed": 3207,
      "amountAed": 3207,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Dependant visa + medical + Emirates ID · child",
      "qty": 1,
      "unitAed": 2395,
      "amountAed": 2395,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Dedicated desk, 12 months",
      "qty": 1,
      "unitAed": 13800,
      "amountAed": 13800,
      "group": "Provider",
      "sourceId": "desk-price"
    }
  ],
  "included": [
    "Every filing and booking",
    "Document drafting",
    "The bank file",
    "12 months of deadline tracking",
    "Price locked at payment"
  ],
  "excluded": [
    "Health insurance (required for residence visas; quoted by the insurer)",
    "Housing and school fees",
    "Legalisation of home-country documents",
    "Bookkeeping and audit",
    "The bank plan (from AED 99/month)",
    "VAT on Atlas71's fee"
  ],
  "validUntil": "2026-11-01",
  "paid": false
};

export const priceCardPaid: PriceCardData = {
  "routeName": "ADGM Tech Startup Licence",
  "totalAed": 40075,
  "lines": [
    {
      "label": "Atlas71 landing fee",
      "amountAed": 4900,
      "group": "Atlas",
      "sourceId": "atlas-pricing"
    },
    {
      "label": "ADGM Tech Startup Licence, year one",
      "amountAed": 6611,
      "group": "Government",
      "sourceId": "adgm-fees"
    },
    {
      "label": "Establishment card + e-Channels",
      "amountAed": 5325,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Employment visa (2 years)",
      "qty": 1,
      "unitAed": 3237,
      "amountAed": 3237,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Medical test + Emirates ID",
      "qty": 1,
      "unitAed": 600,
      "amountAed": 600,
      "group": "Government",
      "sourceId": "seha-medical"
    },
    {
      "label": "Dependant visa + medical + Emirates ID · adult",
      "qty": 1,
      "unitAed": 3207,
      "amountAed": 3207,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Dependant visa + medical + Emirates ID · child",
      "qty": 1,
      "unitAed": 2395,
      "amountAed": 2395,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Dedicated desk, 12 months",
      "qty": 1,
      "unitAed": 13800,
      "amountAed": 13800,
      "group": "Provider",
      "sourceId": "desk-price"
    }
  ],
  "included": [
    "Every filing and booking",
    "Document drafting",
    "The bank file",
    "12 months of deadline tracking",
    "Price locked at payment"
  ],
  "excluded": [
    "Health insurance (required for residence visas; quoted by the insurer)",
    "Housing and school fees",
    "Legalisation of home-country documents",
    "Bookkeeping and audit",
    "The bank plan (from AED 99/month)",
    "VAT on Atlas71's fee"
  ],
  "validUntil": "2026-11-01",
  "paid": true
};

export const priceCardMasdar: PriceCardData = {
  "routeName": "Masdar City Free Zone · Innovation",
  "totalAed": 17500,
  "lines": [
    {
      "label": "Atlas71 landing fee",
      "amountAed": 4900,
      "group": "Atlas",
      "sourceId": "atlas-pricing"
    },
    {
      "label": "Masdar Innovation package (AED 12,000 + 5% VAT, flexi desk, 2 visas)",
      "amountAed": 12600,
      "group": "Government",
      "sourceId": "masdar"
    }
  ],
  "included": [
    "Every filing and booking",
    "Document drafting",
    "The bank file",
    "12 months of deadline tracking",
    "Price locked at payment"
  ],
  "excluded": [
    "Establishment card, visas, medicals and Emirates IDs (quoted by the free zone)",
    "Health insurance (required for residence visas; quoted by the insurer)",
    "Housing and school fees",
    "Legalisation of home-country documents",
    "Bookkeeping and audit",
    "The bank plan (from AED 99/month)",
    "VAT on Atlas71's fee"
  ],
  "validUntil": "2026-11-01",
  "paid": false
};

export const priceCardByteforge: PriceCardData = {
  "routeName": "ADGM licence (non-financial)",
  "totalAed": 74474,
  "lines": [
    {
      "label": "Atlas71 landing fee",
      "amountAed": 4900,
      "group": "Atlas",
      "sourceId": "atlas-pricing"
    },
    {
      "label": "ADGM licence (non-financial), year one",
      "amountAed": 21301,
      "group": "Government",
      "sourceId": "adgm-fees"
    },
    {
      "label": "Establishment card + e-Channels",
      "amountAed": 5325,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Employment visa (2 years)",
      "qty": 4,
      "unitAed": 3237,
      "amountAed": 12948,
      "group": "Government",
      "sourceId": "adgm-gs-fees"
    },
    {
      "label": "Medical test + Emirates ID",
      "qty": 4,
      "unitAed": 600,
      "amountAed": 2400,
      "group": "Government",
      "sourceId": "seha-medical"
    },
    {
      "label": "Dedicated desk, 12 months",
      "qty": 2,
      "unitAed": 13800,
      "amountAed": 27600,
      "group": "Provider",
      "sourceId": "desk-price"
    }
  ],
  "included": [
    "Every filing and booking",
    "Document drafting",
    "The bank file",
    "12 months of deadline tracking",
    "Price locked at payment"
  ],
  "excluded": [
    "Health insurance (required for residence visas; quoted by the insurer)",
    "Housing and school fees",
    "Legalisation of home-country documents",
    "Bookkeeping and audit",
    "The bank plan (from AED 99/month)",
    "VAT on Atlas71's fee"
  ],
  "validUntil": "2026-11-01",
  "paid": false
};

export const filingsCard: FilingsCardData = {
  "items": [
    {
      "provider": "Hub71",
      "title": "Hub71 eligibility letter",
      "ref": "H71-EL-26-04812",
      "filedOn": "2026-10-02",
      "etaOn": "2026-10-16",
      "status": "filed"
    },
    {
      "provider": "ADGM-zone coworking",
      "title": "Dedicated desk lease",
      "ref": "CWK-26-07775",
      "filedOn": "2026-10-02",
      "etaOn": "2026-10-04",
      "status": "filed"
    }
  ]
};

export const updatesCard: UpdatesCardData = {
  "from": "2026-10-16",
  "to": "2026-10-23",
  "events": [
    {
      "on": "2026-10-23",
      "kind": "issued",
      "text": "Licence issued: Routely is incorporated with ADGM Registration Authority",
      "step": "incorporation"
    },
    {
      "on": "2026-10-23",
      "kind": "filed",
      "text": "Filed establishment card + e-Channels with ADGM Government Services (ADGM-GS-EC-121974), ETA 28 Oct",
      "step": "establishment_card"
    },
    {
      "on": "2026-10-23",
      "kind": "filed",
      "text": "Filed corporate tax registration with FTA · EmaraTax (FTA-TRN-100060539117505), ETA 28 Oct",
      "step": "tax_registration"
    },
    {
      "on": "2026-10-23",
      "kind": "needs_input",
      "text": "Bank file: confirm where the company's money came from (who invested, how much, how); the ownership chain from the UAE company up to the people, with percentages",
      "step": "bank_file"
    },
    {
      "on": "2026-10-23",
      "kind": "deadline",
      "text": "Corporate tax registration is due by 23 Jan 2027, 3 months from incorporation; late registration costs AED 10,000 [source:fta-ct]",
      "step": "tax_registration"
    }
  ],
  "waitingOn": [
    "Bank file: confirm where the company's money came from (who invested, how much, how); the ownership chain from the UAE company up to the people, with percentages"
  ]
};

export const updatesCardEarly: UpdatesCardData = {
  "from": "2026-10-02",
  "to": "2026-10-16",
  "events": [
    {
      "on": "2026-10-04",
      "kind": "issued",
      "text": "Dedicated desk lease signed (1 desk)",
      "step": "desk"
    },
    {
      "on": "2026-10-16",
      "kind": "issued",
      "text": "Hub71 eligibility letter issued",
      "step": "hub71_letter"
    },
    {
      "on": "2026-10-16",
      "kind": "filed",
      "text": "Filed incorporation + commercial licence with ADGM Registration Authority (ADGM-RA-2026-48213), ETA 23 Oct",
      "step": "incorporation"
    }
  ],
  "waitingOn": []
};

export const bankFileCard: BankFileCardData = {
  "bank": "Wio Business",
  "sections": [
    {
      "title": "Company and activity",
      "body": "Routely ADGM Ltd is the Abu Dhabi subsidiary of Routely Inc., a Delaware C-corp. It sells route-planning software to delivery fleets on monthly subscriptions: a web app for dispatchers and a mobile app for drivers. Customers are logistics companies in India and the Gulf."
    },
    {
      "title": "Source of funds",
      "body": "Routely Inc. raised USD 600,000 at seed. [Founder confirmation required] Who invested, through which instrument, and how the money reaches the Abu Dhabi company."
    },
    {
      "title": "Ownership",
      "body": "Routely ADGM Ltd is wholly owned by Routely Inc. [Founder confirmation required] The shareholders of Routely Inc. and their percentages."
    },
    {
      "title": "Expected transactions",
      "body": "About USD 40,000 a month in customer subscriptions, from the UAE, Saudi Arabia and India. Outgoing: payroll, the ADGM desk lease and cloud hosting."
    },
    {
      "title": "Signatory",
      "body": "Meera Iyer, CEO. Resident in Abu Dhabi once her Emirates ID is issued."
    }
  ],
  "missing": [
    "Where the company's money came from: who invested, how much, and how",
    "The ownership chain from the UAE company up to the people, with percentages"
  ],
  "checks": [
    {
      "key": "funds_explained",
      "label": "Source of funds explained",
      "p": 0.21,
      "verdict": "flag",
      "note": "Source of funds not explained."
    },
    {
      "key": "ownership_traced",
      "label": "Ownership traced to people",
      "p": 0.17,
      "verdict": "flag",
      "note": "Ownership chain incomplete."
    },
    {
      "key": "activity_specific",
      "label": "Business activity is specific",
      "p": 0.93,
      "verdict": "pass"
    },
    {
      "key": "transactions_fit",
      "label": "Expected transactions fit",
      "p": 0.86,
      "verdict": "pass"
    },
    {
      "key": "high_risk",
      "label": "High-risk activity mentioned",
      "p": 0.03,
      "verdict": "pass"
    }
  ],
  "checksMeta": {
    "live": true,
    "latencyMs": 281,
    "model": "jev-1"
  },
  "ready": false
};

export const bankFileReady: BankFileCardData = {
  "bank": "Wio Business",
  "sections": [
    {
      "title": "Company and activity",
      "body": "Routely ADGM Ltd is the Abu Dhabi subsidiary of Routely Inc., a Delaware C-corp. It sells route-planning software to delivery fleets on monthly subscriptions: a web app for dispatchers and a mobile app for drivers. Customers are logistics companies in India and the Gulf."
    },
    {
      "title": "Source of funds",
      "body": "Routely Inc. raised USD 600,000 from 8 angel investors through SAFEs. The funds sit with Routely Inc., which capitalises the Abu Dhabi company."
    },
    {
      "title": "Ownership",
      "body": "Routely ADGM Ltd is 100% owned by Routely Inc. Routely Inc. is owned by Meera Iyer (55%) and Arjun Rao (45%)."
    },
    {
      "title": "Expected transactions",
      "body": "About USD 40,000 a month in customer subscriptions, from the UAE, Saudi Arabia and India. Outgoing: payroll, the ADGM desk lease and cloud hosting."
    },
    {
      "title": "Signatory",
      "body": "Meera Iyer, CEO. Resident in Abu Dhabi once her Emirates ID is issued."
    }
  ],
  "missing": [],
  "checks": [
    {
      "key": "funds_explained",
      "label": "Source of funds explained",
      "p": 0.91,
      "verdict": "pass"
    },
    {
      "key": "ownership_traced",
      "label": "Ownership traced to people",
      "p": 0.94,
      "verdict": "pass"
    },
    {
      "key": "activity_specific",
      "label": "Business activity is specific",
      "p": 0.95,
      "verdict": "pass"
    },
    {
      "key": "transactions_fit",
      "label": "Expected transactions fit",
      "p": 0.88,
      "verdict": "pass"
    },
    {
      "key": "high_risk",
      "label": "High-risk activity mentioned",
      "p": 0.03,
      "verdict": "pass"
    }
  ],
  "checksMeta": {
    "live": true,
    "latencyMs": 264,
    "model": "jev-1"
  },
  "ready": true
};

export const exportCard: { generatedOn: string } = {
  "generatedOn": "2026-10-23"
};

export const stateFacts: CaseState = {
  "v": 1,
  "persona": "routely",
  "startDate": "2026-10-02",
  "today": "2026-10-02",
  "profile": {
    "company": "Routely",
    "description": "Route-planning SaaS for delivery fleets, sold on monthly subscriptions to logistics companies in India and the Gulf.",
    "website": "routely.io",
    "homeBase": "Bangalore, India",
    "stage": "Seed",
    "fundingUsd": 600000,
    "fundingSource": null,
    "parentEntity": "Routely Inc., Delaware C-corp",
    "ownership": null,
    "hub71Letter": "none",
    "sellsOnshoreUAE": null,
    "monthlyVolumeUsd": 40000,
    "transactionCountries": "UAE, Saudi Arabia, India",
    "people": [
      {
        "id": "p-meera-iyer",
        "name": "Meera Iyer",
        "role": "founder",
        "nationality": null,
        "relocating": true
      },
      {
        "id": "p-arjun-rao",
        "name": "Arjun Rao",
        "role": "founder",
        "nationality": null,
        "relocating": false
      }
    ],
    "dependants": [
      {
        "id": "d-rohan",
        "name": "Rohan",
        "relation": "spouse",
        "sponsorId": "p-meera-iyer"
      },
      {
        "id": "d-anya",
        "name": "Anya",
        "relation": "child",
        "sponsorId": "p-meera-iyer"
      }
    ]
  },
  "fit": null,
  "route": null,
  "paid": null,
  "filings": [],
  "events": [],
  "bankFile": null,
  "inputs": {
    "dependants": "confirmed"
  }
};

export const stateUnpaid: CaseState = {
  "v": 1,
  "persona": "routely",
  "startDate": "2026-10-02",
  "today": "2026-10-02",
  "profile": {
    "company": "Routely",
    "description": "Route-planning SaaS for delivery fleets, sold on monthly subscriptions to logistics companies in India and the Gulf.",
    "website": "routely.io",
    "homeBase": "Bangalore, India",
    "stage": "Seed",
    "fundingUsd": 600000,
    "fundingSource": null,
    "parentEntity": "Routely Inc., Delaware C-corp",
    "ownership": null,
    "hub71Letter": "none",
    "sellsOnshoreUAE": null,
    "monthlyVolumeUsd": 40000,
    "transactionCountries": "UAE, Saudi Arabia, India",
    "people": [
      {
        "id": "p-meera-iyer",
        "name": "Meera Iyer",
        "role": "founder",
        "nationality": null,
        "relocating": true
      },
      {
        "id": "p-arjun-rao",
        "name": "Arjun Rao",
        "role": "founder",
        "nationality": null,
        "relocating": false
      }
    ],
    "dependants": [
      {
        "id": "d-rohan",
        "name": "Rohan",
        "relation": "spouse",
        "sponsorId": "p-meera-iyer"
      },
      {
        "id": "d-anya",
        "name": "Anya",
        "relation": "child",
        "sponsorId": "p-meera-iyer"
      }
    ]
  },
  "fit": {
    "route": "adgm_tsl",
    "reasons": [
      "You sell your own technology product, which is what the Tech Startup Licence is for [source:adgm-tsl].",
      "It's the lowest ADGM licence fee, AED 6,611 in year one, and it's incentivised for up to 3 years [source:adgm-fees].",
      "You stay under English common law, with 3 visas for each dedicated desk [source:adgm-tsl]."
    ],
    "flags": [],
    "alternatives": [
      "adgm_standard",
      "masdar"
    ],
    "judgments": [
      {
        "key": "tech_product",
        "label": "Sells its own tech product",
        "p": 0.94,
        "verdict": "pass"
      },
      {
        "key": "service_provider",
        "label": "Technology service provider",
        "p": 0.07,
        "verdict": "pass"
      },
      {
        "key": "regulated_finance",
        "label": "Regulated financial activity",
        "p": 0.03,
        "verdict": "pass"
      },
      {
        "key": "excluded_sector",
        "label": "Retail, manufacturing or gaming",
        "p": 0.04,
        "verdict": "pass"
      },
      {
        "key": "scalable",
        "label": "Scalable technology",
        "p": 0.91,
        "verdict": "pass"
      }
    ],
    "meta": {
      "live": true,
      "latencyMs": 312,
      "model": "jev-1"
    },
    "checkedAt": "2026-10-02",
    "profileKey": "v0plwy"
  },
  "route": "adgm_tsl",
  "paid": null,
  "filings": [],
  "events": [],
  "bankFile": null,
  "inputs": {
    "dependants": "confirmed"
  }
};

export const statePaid: CaseState = {
  "v": 1,
  "persona": "routely",
  "startDate": "2026-10-02",
  "today": "2026-10-23",
  "profile": {
    "company": "Routely",
    "description": "Route-planning SaaS for delivery fleets, sold on monthly subscriptions to logistics companies in India and the Gulf.",
    "website": "routely.io",
    "homeBase": "Bangalore, India",
    "stage": "Seed",
    "fundingUsd": 600000,
    "fundingSource": null,
    "parentEntity": "Routely Inc., Delaware C-corp",
    "ownership": null,
    "hub71Letter": "none",
    "sellsOnshoreUAE": null,
    "monthlyVolumeUsd": 40000,
    "transactionCountries": "UAE, Saudi Arabia, India",
    "people": [
      {
        "id": "p-meera-iyer",
        "name": "Meera Iyer",
        "role": "founder",
        "nationality": null,
        "relocating": true
      },
      {
        "id": "p-arjun-rao",
        "name": "Arjun Rao",
        "role": "founder",
        "nationality": null,
        "relocating": false
      }
    ],
    "dependants": [
      {
        "id": "d-rohan",
        "name": "Rohan",
        "relation": "spouse",
        "sponsorId": "p-meera-iyer"
      },
      {
        "id": "d-anya",
        "name": "Anya",
        "relation": "child",
        "sponsorId": "p-meera-iyer"
      }
    ]
  },
  "fit": {
    "route": "adgm_tsl",
    "reasons": [
      "You sell your own technology product, which is what the Tech Startup Licence is for [source:adgm-tsl].",
      "It's the lowest ADGM licence fee, AED 6,611 in year one, and it's incentivised for up to 3 years [source:adgm-fees].",
      "You stay under English common law, with 3 visas for each dedicated desk [source:adgm-tsl]."
    ],
    "flags": [],
    "alternatives": [
      "adgm_standard",
      "masdar"
    ],
    "judgments": [
      {
        "key": "tech_product",
        "label": "Sells its own tech product",
        "p": 0.94,
        "verdict": "pass"
      },
      {
        "key": "service_provider",
        "label": "Technology service provider",
        "p": 0.07,
        "verdict": "pass"
      },
      {
        "key": "regulated_finance",
        "label": "Regulated financial activity",
        "p": 0.03,
        "verdict": "pass"
      },
      {
        "key": "excluded_sector",
        "label": "Retail, manufacturing or gaming",
        "p": 0.04,
        "verdict": "pass"
      },
      {
        "key": "scalable",
        "label": "Scalable technology",
        "p": 0.91,
        "verdict": "pass"
      }
    ],
    "meta": {
      "live": true,
      "latencyMs": 312,
      "model": "jev-1"
    },
    "checkedAt": "2026-10-02",
    "profileKey": "v0plwy"
  },
  "route": "adgm_tsl",
  "paid": {
    "on": "2026-10-02",
    "amountAed": 40075
  },
  "filings": [
    {
      "id": "hub71_letter",
      "step": "hub71_letter",
      "provider": "Hub71",
      "ref": "H71-EL-26-04812",
      "filedOn": "2026-10-02",
      "etaOn": "2026-10-16",
      "status": "done",
      "doneOn": "2026-10-16"
    },
    {
      "id": "desk",
      "step": "desk",
      "provider": "ADGM-zone coworking",
      "ref": "CWK-26-07775",
      "filedOn": "2026-10-02",
      "etaOn": "2026-10-04",
      "status": "done",
      "doneOn": "2026-10-04"
    },
    {
      "id": "incorporation",
      "step": "incorporation",
      "provider": "ADGM Registration Authority",
      "ref": "ADGM-RA-2026-48213",
      "filedOn": "2026-10-16",
      "etaOn": "2026-10-23",
      "status": "done",
      "doneOn": "2026-10-23"
    },
    {
      "id": "establishment_card",
      "step": "establishment_card",
      "provider": "ADGM Government Services",
      "ref": "ADGM-GS-EC-121974",
      "filedOn": "2026-10-23",
      "etaOn": "2026-10-28",
      "status": "filed"
    },
    {
      "id": "tax_registration",
      "step": "tax_registration",
      "provider": "FTA · EmaraTax",
      "ref": "FTA-TRN-100060539117505",
      "filedOn": "2026-10-23",
      "etaOn": "2026-10-28",
      "status": "filed"
    }
  ],
  "events": [
    {
      "on": "2026-10-02",
      "kind": "paid",
      "text": "Paid AED 40,075; the price is locked"
    },
    {
      "on": "2026-10-02",
      "kind": "filed",
      "text": "Filed hub71 eligibility letter with Hub71 (H71-EL-26-04812), ETA 16 Oct",
      "step": "hub71_letter"
    },
    {
      "on": "2026-10-02",
      "kind": "filed",
      "text": "Filed dedicated desk lease with ADGM-zone coworking (CWK-26-07775), ETA 4 Oct",
      "step": "desk"
    },
    {
      "on": "2026-10-04",
      "kind": "issued",
      "text": "Dedicated desk lease signed (1 desk)",
      "step": "desk"
    },
    {
      "on": "2026-10-16",
      "kind": "issued",
      "text": "Hub71 eligibility letter issued",
      "step": "hub71_letter"
    },
    {
      "on": "2026-10-16",
      "kind": "filed",
      "text": "Filed incorporation + commercial licence with ADGM Registration Authority (ADGM-RA-2026-48213), ETA 23 Oct",
      "step": "incorporation"
    },
    {
      "on": "2026-10-23",
      "kind": "issued",
      "text": "Licence issued: Routely is incorporated with ADGM Registration Authority",
      "step": "incorporation"
    },
    {
      "on": "2026-10-23",
      "kind": "filed",
      "text": "Filed establishment card + e-Channels with ADGM Government Services (ADGM-GS-EC-121974), ETA 28 Oct",
      "step": "establishment_card"
    },
    {
      "on": "2026-10-23",
      "kind": "filed",
      "text": "Filed corporate tax registration with FTA · EmaraTax (FTA-TRN-100060539117505), ETA 28 Oct",
      "step": "tax_registration"
    },
    {
      "on": "2026-10-23",
      "kind": "needs_input",
      "text": "Bank file: confirm where the company's money came from (who invested, how much, how); the ownership chain from the UAE company up to the people, with percentages",
      "step": "bank_file"
    },
    {
      "on": "2026-10-23",
      "kind": "deadline",
      "text": "Corporate tax registration is due by 23 Jan 2027, 3 months from incorporation; late registration costs AED 10,000 [source:fta-ct]",
      "step": "tax_registration"
    }
  ],
  "bankFile": null,
  "inputs": {
    "dependants": "confirmed",
    "medical:p-meera-iyer": "Sat 24 Oct, 09:00 · SEHA Al Bateen"
  }
};

export const stateByteforge: CaseState = {
  "v": 1,
  "persona": "byteforge",
  "startDate": "2026-10-02",
  "today": "2026-10-02",
  "profile": {
    "company": "Byteforge",
    "description": "Software development agency building custom web and mobile apps for clients in Egypt, the Gulf and Europe, billed per project.",
    "website": "byteforge.dev",
    "homeBase": "Cairo, Egypt",
    "stage": null,
    "fundingUsd": null,
    "fundingSource": null,
    "parentEntity": null,
    "ownership": null,
    "hub71Letter": "none",
    "sellsOnshoreUAE": null,
    "monthlyVolumeUsd": null,
    "transactionCountries": null,
    "people": [
      {
        "id": "p-omar-farouk",
        "name": "Omar Farouk",
        "role": "founder",
        "nationality": null,
        "relocating": true
      },
      {
        "id": "p-laila-mansour",
        "name": "Laila Mansour",
        "role": "employee",
        "nationality": null,
        "relocating": true
      },
      {
        "id": "p-karim-adel",
        "name": "Karim Adel",
        "role": "employee",
        "nationality": null,
        "relocating": true
      },
      {
        "id": "p-nour-hassan",
        "name": "Nour Hassan",
        "role": "employee",
        "nationality": null,
        "relocating": true
      }
    ],
    "dependants": []
  },
  "fit": {
    "route": "adgm_standard",
    "reasons": [
      "The startup licence isn't for technology service providers [source:adgm-tsl].",
      "A standard ADGM non-financial licence covers the activity, under English common law [source:adgm-fees].",
      "Masdar City Free Zone is the cheaper alternative, with a flexi desk included [source:masdar]."
    ],
    "flags": [
      "A specialist confirms this before filing."
    ],
    "alternatives": [
      "masdar"
    ],
    "judgments": [
      {
        "key": "tech_product",
        "label": "Sells its own tech product",
        "p": 0.18,
        "verdict": "flag",
        "note": "Reads as client work rather than an own product."
      },
      {
        "key": "service_provider",
        "label": "Technology service provider",
        "p": 0.93,
        "verdict": "flag",
        "note": "The startup licence isn't for technology service providers [source:adgm-tsl]."
      },
      {
        "key": "regulated_finance",
        "label": "Regulated financial activity",
        "p": 0.02,
        "verdict": "pass"
      },
      {
        "key": "excluded_sector",
        "label": "Retail, manufacturing or gaming",
        "p": 0.05,
        "verdict": "pass"
      },
      {
        "key": "scalable",
        "label": "Scalable technology",
        "p": 0.58,
        "verdict": "review"
      }
    ],
    "meta": {
      "live": true,
      "latencyMs": 287,
      "model": "jev-1"
    },
    "checkedAt": "2026-10-02",
    "profileKey": "1m08mxy"
  },
  "route": "adgm_standard",
  "paid": null,
  "filings": [],
  "events": [],
  "bankFile": null,
  "inputs": {
    "dependants": "confirmed"
  }
};

export const conversation: UiMessage[] = [
  {
    "id": "u1",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "Hi, I'm Meera Iyer, CEO of Routely (routely.io). We sell route-planning software to delivery fleets: a web app for dispatchers and a mobile app for drivers, on monthly subscriptions, to logistics companies in India and the Gulf. We're a seed-stage Delaware C-corp, Routely Inc., with the team in Bangalore, and we've raised $600k. I'm moving to Abu Dhabi with my husband Rohan and our daughter Anya, who's 6. My co-founder Arjun Rao is our CTO. We expect around $40k a month in customer payments, from the UAE, Saudi Arabia and India."
      }
    ]
  },
  {
    "id": "a1",
    "role": "assistant",
    "parts": [
      {
        "type": "activity",
        "text": "Saved Routely's facts",
        "done": true
      },
      {
        "type": "text",
        "text": "Thanks, Meera. I've saved Routely, the Delaware parent and your family's move. One question before I check your route: **is Arjun relocating to Abu Dhabi too?**"
      },
      {
        "type": "choices",
        "options": [
          "Just me for now",
          "Arjun is moving too",
          "He'll join next year"
        ]
      }
    ]
  },
  {
    "id": "u2",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "Just me for now"
      }
    ]
  },
  {
    "id": "a2",
    "role": "assistant",
    "parts": [
      {
        "type": "text",
        "text": "Got it: one founder visa, plus dependant visas for Rohan and Anya. Do you already have a **Hub71 eligibility letter**? It's what unlocks the ADGM Tech Startup Licence [source:adgm-tsl], and it's separate from the selective Access programme [source:hub71-tsl]."
      },
      {
        "type": "choices",
        "options": [
          "No",
          "Yes, I have one",
          "I've applied"
        ]
      }
    ]
  },
  {
    "id": "u3",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "No"
      }
    ]
  },
  {
    "id": "a3",
    "role": "assistant",
    "parts": [
      {
        "type": "activity",
        "text": "Checked eligibility with TypeSafe · 312 ms",
        "done": true
      },
      {
        "type": "card",
        "card": {
          "kind": "route",
          "data": {
            "recommended": {
              "id": "adgm_tsl",
              "name": "ADGM Tech Startup Licence",
              "summary": "ADGM's licence for tech startups, under English common law. It's incentivised for up to 3 years, needs a Hub71 eligibility letter, and gives 3 visas per dedicated desk.",
              "licenceAed": 6611
            },
            "reasons": [
              "You sell your own technology product, which is what the Tech Startup Licence is for [source:adgm-tsl].",
              "It's the lowest ADGM licence fee, AED 6,611 in year one, and it's incentivised for up to 3 years [source:adgm-fees].",
              "You stay under English common law, with 3 visas for each dedicated desk [source:adgm-tsl]."
            ],
            "prerequisites": [
              {
                "label": "Hub71 eligibility letter",
                "state": "missing",
                "note": "Atlas71 files it [source:hub71-tsl]."
              },
              {
                "label": "Dedicated desk",
                "state": "missing",
                "note": "Required: AED 13,800 a year each, 3 visas per desk; hot desks don't count. Atlas71 books it [source:adgm-faq]."
              },
              {
                "label": "Ownership review",
                "state": "review",
                "note": "ADGM and the bank need the parent's certificate of incorporation and shareholder register."
              }
            ],
            "alternatives": [
              {
                "id": "adgm_standard",
                "name": "ADGM licence (non-financial)",
                "why": "The fallback if the Hub71 letter doesn't come through: any non-financial activity, the same desk rule, a higher licence fee.",
                "licenceAed": 21301
              },
              {
                "id": "masdar",
                "name": "Masdar City Free Zone · Innovation",
                "why": "AED 7,811 less on licence and desk, with a flexi desk included. 2 visas included, with visa fees quoted by the free zone. UAE civil law instead of common law.",
                "licenceAed": 12600
              }
            ],
            "checks": [
              {
                "key": "tech_product",
                "label": "Sells its own tech product",
                "p": 0.94,
                "verdict": "pass"
              },
              {
                "key": "service_provider",
                "label": "Technology service provider",
                "p": 0.07,
                "verdict": "pass"
              },
              {
                "key": "regulated_finance",
                "label": "Regulated financial activity",
                "p": 0.03,
                "verdict": "pass"
              },
              {
                "key": "excluded_sector",
                "label": "Retail, manufacturing or gaming",
                "p": 0.04,
                "verdict": "pass"
              },
              {
                "key": "scalable",
                "label": "Scalable technology",
                "p": 0.91,
                "verdict": "pass"
              }
            ],
            "checksMeta": {
              "live": true,
              "latencyMs": 312,
              "model": "jev-1"
            },
            "sources": [
              {
                "id": "adgm-tsl",
                "title": "ADGM · Tech Startup Licence",
                "url": "https://www.adgm.com/business-areas/tech-startup"
              },
              {
                "id": "adgm-fees",
                "title": "ADGM · Schedule of fees 2025",
                "url": "https://assets.adgm.com/download/assets/Schedule+of+Fees+2025.pdf/6f25a452823d11ef808c3e0446867bce"
              },
              {
                "id": "hub71-tsl",
                "title": "Hub71 · FAQs",
                "url": "https://www.hub71.com/faqs"
              },
              {
                "id": "adgm-faq",
                "title": "ADGM · Setting up FAQ",
                "url": "https://www.adgm.com/faqs/setting-up"
              },
              {
                "id": "masdar",
                "title": "Masdar City Free Zone · Licences",
                "url": "https://masdarcityfreezone.com/explore/license-and-registration"
              }
            ]
          }
        }
      },
      {
        "type": "text",
        "text": "The **ADGM Tech Startup Licence** fits: you sell your own product, and it's the lowest ADGM licence fee. I'll file the Hub71 letter and book the desk once you confirm.\n\n- Ownership needs a short review because of the Delaware parent.\n- These are AI checks, not official decisions."
      },
      {
        "type": "choices",
        "options": [
          "Show my plan",
          "What will it cost?"
        ]
      }
    ]
  },
  {
    "id": "u4",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "What will it cost?"
      }
    ]
  },
  {
    "id": "a4",
    "role": "assistant",
    "parts": [
      {
        "type": "card",
        "card": {
          "kind": "price",
          "data": {
            "routeName": "ADGM Tech Startup Licence",
            "totalAed": 40075,
            "lines": [
              {
                "label": "Atlas71 landing fee",
                "amountAed": 4900,
                "group": "Atlas",
                "sourceId": "atlas-pricing"
              },
              {
                "label": "ADGM Tech Startup Licence, year one",
                "amountAed": 6611,
                "group": "Government",
                "sourceId": "adgm-fees"
              },
              {
                "label": "Establishment card + e-Channels",
                "amountAed": 5325,
                "group": "Government",
                "sourceId": "adgm-gs-fees"
              },
              {
                "label": "Employment visa (2 years)",
                "qty": 1,
                "unitAed": 3237,
                "amountAed": 3237,
                "group": "Government",
                "sourceId": "adgm-gs-fees"
              },
              {
                "label": "Medical test + Emirates ID",
                "qty": 1,
                "unitAed": 600,
                "amountAed": 600,
                "group": "Government",
                "sourceId": "seha-medical"
              },
              {
                "label": "Dependant visa + medical + Emirates ID · adult",
                "qty": 1,
                "unitAed": 3207,
                "amountAed": 3207,
                "group": "Government",
                "sourceId": "adgm-gs-fees"
              },
              {
                "label": "Dependant visa + medical + Emirates ID · child",
                "qty": 1,
                "unitAed": 2395,
                "amountAed": 2395,
                "group": "Government",
                "sourceId": "adgm-gs-fees"
              },
              {
                "label": "Dedicated desk, 12 months",
                "qty": 1,
                "unitAed": 13800,
                "amountAed": 13800,
                "group": "Provider",
                "sourceId": "desk-price"
              }
            ],
            "included": [
              "Every filing and booking",
              "Document drafting",
              "The bank file",
              "12 months of deadline tracking",
              "Price locked at payment"
            ],
            "excluded": [
              "Health insurance (required for residence visas; quoted by the insurer)",
              "Housing and school fees",
              "Legalisation of home-country documents",
              "Bookkeeping and audit",
              "The bank plan (from AED 99/month)",
              "VAT on Atlas71's fee"
            ],
            "validUntil": "2026-11-01",
            "paid": false
          }
        }
      },
      {
        "type": "text",
        "text": "One price, all-in: government and provider fees at cost, plus Atlas71's landing fee. Confirm on the card when you're ready and I start filing."
      }
    ]
  },
  {
    "id": "u5",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "Confirm and pay"
      }
    ],
    "action": {
      "type": "pay"
    }
  },
  {
    "id": "a5",
    "role": "assistant",
    "parts": [
      {
        "type": "activity",
        "text": "Filing with Hub71 and the desk provider",
        "done": true
      },
      {
        "type": "card",
        "card": {
          "kind": "filings",
          "data": {
            "items": [
              {
                "provider": "Hub71",
                "title": "Hub71 eligibility letter",
                "ref": "H71-EL-26-04812",
                "filedOn": "2026-10-02",
                "etaOn": "2026-10-16",
                "status": "filed"
              },
              {
                "provider": "ADGM-zone coworking",
                "title": "Dedicated desk lease",
                "ref": "CWK-26-07775",
                "filedOn": "2026-10-02",
                "etaOn": "2026-10-04",
                "status": "filed"
              }
            ]
          }
        }
      },
      {
        "type": "text",
        "text": "Paid, and filed in the sandbox: your Hub71 letter (H71-EL-26-04812) and the desk lease. I'll file incorporation the day the letter lands."
      }
    ]
  },
  {
    "id": "u6",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "Fast-forward 2 weeks"
      }
    ],
    "action": {
      "type": "advance",
      "days": 14
    }
  },
  {
    "id": "a6",
    "role": "assistant",
    "parts": [
      {
        "type": "card",
        "card": {
          "kind": "updates",
          "data": {
            "from": "2026-10-02",
            "to": "2026-10-16",
            "events": [
              {
                "on": "2026-10-04",
                "kind": "issued",
                "text": "Dedicated desk lease signed (1 desk)",
                "step": "desk"
              },
              {
                "on": "2026-10-16",
                "kind": "issued",
                "text": "Hub71 eligibility letter issued",
                "step": "hub71_letter"
              },
              {
                "on": "2026-10-16",
                "kind": "filed",
                "text": "Filed incorporation + commercial licence with ADGM Registration Authority (ADGM-RA-2026-48213), ETA 23 Oct",
                "step": "incorporation"
              }
            ],
            "waitingOn": []
          }
        }
      },
      {
        "type": "text",
        "text": "The letter came through on day 14, and incorporation is filed with ADGM (ETA 23 Oct)."
      },
      {
        "type": "choices",
        "options": [
          "Skip to the next event",
          "Show my plan"
        ]
      }
    ]
  }
];

export const compareCard: CompareCardData = {
  homeBase: "Bangalore, India",
  homeLabel: "Bangalore",
  verdict:
    "Abu Dhabi fits Routely: your Gulf customers are next door and you keep far more of your profit, but your family's living costs roughly double.",
  rows: [
    { topic: "taxes", label: "Corporate tax", abuDhabi: "0% up to AED 375k profit, 9% above", home: "About 25% (22% + surcharge and cess)", edge: "abu_dhabi", matters: true, sourceIds: ["fta-ct"] },
    { topic: "taxes", label: "Personal income tax", abuDhabi: "0%", home: "Up to about 39% at the top rate", edge: "abu_dhabi", matters: true, sourceIds: [] },
    { topic: "taxes", label: "VAT / GST on software", abuDhabi: "5% VAT", home: "18% GST", edge: "abu_dhabi", sourceIds: [] },
    { topic: "opportunities", label: "Customers", abuDhabi: "Gulf logistics and government buyers, a short flight away", home: "Large domestic market, price-sensitive buyers", edge: "abu_dhabi", matters: true, sourceIds: [] },
    { topic: "opportunities", label: "Funding", abuDhabi: "Hub71 Access: AED 250k in kind + AED 250k via SAFE (selective)", home: "Deeper seed ecosystem, more local VCs", edge: "even", sourceIds: ["hub71-access"] },
    { topic: "residency", label: "Founder visa", abuDhabi: "2-year residence through your company; golden visa possible", home: "No visa needed", edge: "home", sourceIds: ["golden-visa"] },
    { topic: "residency", label: "Family", abuDhabi: "Spouse and child sponsored on your visa", home: "No paperwork", edge: "home", sourceIds: ["apostille"] },
    { topic: "work", label: "Hiring", abuDhabi: "International talent on work permits, 3 visas per desk", home: "Large engineering pool at lower salaries", edge: "home", matters: true, sourceIds: ["adgm-tsl"] },
    { topic: "work", label: "Legal system", abuDhabi: "English common law courts in ADGM", home: "Indian courts, slower commercial cases", edge: "abu_dhabi", sourceIds: [] },
    { topic: "costs", label: "Rent, 2-bed", abuDhabi: "AED 90k–130k a year", home: "AED 25k–40k a year", edge: "home", matters: true, sourceIds: [] },
    { topic: "costs", label: "School, one child", abuDhabi: "AED 45k–75k a year", home: "AED 10k–30k a year", edge: "home", sourceIds: [] },
  ],
  firstYear: [
    { label: "Landing (one-off)", abuDhabiAed: [40075, 40075], homeAed: null, note: "Atlas71's all-in price for this case." },
    { label: "Rent, 2-bed", abuDhabiAed: [90000, 130000], homeAed: [25000, 40000] },
    { label: "School, one child", abuDhabiAed: [45000, 75000], homeAed: [10000, 30000] },
    { label: "Health insurance, family", abuDhabiAed: [8000, 15000], homeAed: [3000, 6000], note: "Required for residence visas in Abu Dhabi." },
  ],
  checks: [
    { key: "tax_matters", label: "Tax savings matter for this company", p: 0.82, verdict: "pass" },
    { key: "gulf_customers", label: "Sells to customers in the Gulf", p: 0.9, verdict: "pass" },
    { key: "family_costs", label: "Family costs are manageable", p: 0.55, verdict: "review", note: "School fees are the biggest difference." },
  ],
  checksMeta: { live: true, latencyMs: 248, model: "jev-1" },
  sources: [
    { id: "fta-ct", title: "FTA · Corporate tax registration timeframes", url: "https://tax.gov.ae/en/media.centre/news/federal.tax.authority.issues.new.decision.on.specified.timeframes.for.corporate.tax.registration.aspx" },
    { id: "hub71-access", title: "Hub71 · Access programme", url: "https://www.hub71.com/program/access-programme" },
  ],
};

export const checkoutCard: CheckoutCardData = {
  merchant: "Atlas71",
  description: "Abu Dhabi landing for Routely · ADGM Tech Startup Licence",
  amountAed: 40075,
  lines: [
    { label: "Atlas71 landing fee", amountAed: 4900 },
    { label: "Government fees, at cost", amountAed: 21375 },
    { label: "Providers, at cost", amountAed: 13800 },
  ],
  payer: { name: "Meera Iyer", email: "meera@routely.io", company: "Routely", country: "India" },
  method: { brand: "Visa", last4: "4242", expiry: "12/29", label: "Test card" },
  receipt: "A71-RCPT-26-418207",
  paidOn: "2026-10-02",
  status: "succeeded",
};
