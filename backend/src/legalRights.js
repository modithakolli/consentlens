const RIGHTS = {
  IN: {
    region: "India",
    law: "Digital Personal Data Protection Act, 2023",
    rights: [
      "Ask what personal data is being processed.",
      "Request correction or erasure of personal data.",
      "Withdraw consent for optional processing.",
      "Raise a grievance with the organization."
    ],
    note: "This is general awareness, not legal advice."
  },
  EU: {
    region: "European Union",
    law: "General Data Protection Regulation",
    rights: [
      "Access your personal data.",
      "Request correction, deletion, or restriction.",
      "Object to certain processing and direct marketing.",
      "Request data portability.",
      "Withdraw consent where consent is the legal basis."
    ],
    note: "This is general awareness, not legal advice."
  },
  US_CA: {
    region: "California, United States",
    law: "CCPA/CPRA",
    rights: [
      "Know what personal information is collected, shared, or sold.",
      "Delete certain personal information.",
      "Opt out of sale or sharing.",
      "Correct inaccurate personal information.",
      "Limit use of sensitive personal information."
    ],
    note: "This is general awareness, not legal advice."
  },
  DEFAULT: {
    region: "General",
    law: "General privacy principles",
    rights: [
      "Review privacy settings before accepting optional tracking.",
      "Ask for access, deletion, or correction where local law provides it.",
      "Withdraw consent where the service offers consent controls."
    ],
    note: "Rights vary by location. This is general awareness, not legal advice."
  }
};

export function legalRightsForRegion(region) {
  const key = String(region || "").toUpperCase();
  return RIGHTS[key] || RIGHTS.DEFAULT;
}
