const APP_RULES = [
  {
    name: "Amazon",
    aliases: ["amazon", "amazon.in", "amazon.com"],
    privacyScore: 42,
    platform: "E-commerce, cloud, and digital services",
    dataCategories: ["Identity", "Purchase history", "Browsing activity", "Device data", "Delivery details"],
    permissions: ["Account access", "Location (delivery and fraud)", "Notifications"],
    thirdParties: ["Advertising partners", "Logistics partners", "Cloud infrastructure"],
    concerns: ["Targeted recommendations", "Cross-service profiling", "Partner sharing"],
    summary: "Amazon combines commerce, logistics, and account data across a large ecosystem."
  },
  {
    name: "Instagram",
    aliases: ["instagram", "instagram app", "ig"],
    privacyScore: 28,
    platform: "Social media and advertising",
    dataCategories: ["Identity", "Contacts", "Photos and videos", "Usage data", "Device identifiers"],
    permissions: ["Camera", "Microphone", "Contacts", "Location"],
    thirdParties: ["Meta advertising systems", "Analytics vendors"],
    concerns: ["Cross-app tracking", "Ad personalization", "Behavioral profiling"],
    summary: "Instagram is tightly connected to Meta's advertising and identity ecosystem."
  },
  {
    name: "TikTok",
    aliases: ["tiktok", "tiktok app"],
    privacyScore: 24,
    platform: "Short-form video and advertising",
    dataCategories: ["Device identifiers", "Usage data", "Location", "Contacts", "Content interactions"],
    permissions: ["Camera", "Microphone", "Location", "Contacts"],
    thirdParties: ["Advertising partners", "Analytics vendors"],
    concerns: ["Behavioral profiling", "Ad targeting", "Media interaction tracking"],
    summary: "TikTok's privacy posture is heavily centered on recommendation and engagement signals."
  },
  {
    name: "WhatsApp",
    aliases: ["whatsapp", "whatsapp messenger"],
    privacyScore: 54,
    platform: "Messaging and calls",
    dataCategories: ["Contacts", "Device data", "Usage data", "Phone number", "Metadata"],
    permissions: ["Contacts", "Microphone", "Camera", "Notifications"],
    thirdParties: ["Meta infrastructure", "Service providers"],
    concerns: ["Metadata sharing", "Account linkage", "Device-level profiling"],
    summary: "WhatsApp is privacy-forward for message content, but metadata and account linkage still matter."
  },
  {
    name: "Uber",
    aliases: ["uber", "uber app"],
    privacyScore: 47,
    platform: "Mobility and delivery",
    dataCategories: ["Location", "Identity", "Trip history", "Payment data", "Device data"],
    permissions: ["Location", "Notifications", "Contacts (optional)"],
    thirdParties: ["Drivers", "Payment processors", "Analytics vendors"],
    concerns: ["Location tracking", "Trip profiling", "Partner sharing"],
    summary: "Uber needs strong location and identity access to function, which makes consent clarity important."
  },
  {
    name: "OpenAI",
    aliases: ["openai", "chatgpt", "chatgpt.com"],
    privacyScore: 62,
    platform: "AI assistants and developer APIs",
    dataCategories: ["Prompts", "Usage data", "Account data", "Device data", "Uploaded content"],
    permissions: ["Account access", "File uploads (when used)", "Notifications"],
    thirdParties: ["Cloud infrastructure", "Safety and analytics vendors"],
    concerns: ["Prompt retention", "Model training settings", "Enterprise data boundaries"],
    summary: "OpenAI products can be privacy-sensitive because user prompts and files may contain highly personal data."
  },
  {
    name: "Microsoft",
    aliases: ["microsoft", "microsoft 365", "office", "outlook", "onedrive"],
    privacyScore: 58,
    platform: "Productivity and identity ecosystem",
    dataCategories: ["Identity", "Email", "Files", "Calendar", "Usage data"],
    permissions: ["Mail", "Files", "Contacts", "Calendar"],
    thirdParties: ["Microsoft services", "Identity providers", "Analytics vendors"],
    concerns: ["Broad account access", "Enterprise data exposure", "Cross-service correlation"],
    summary: "Microsoft services are useful but frequently come with broad account-scoped permissions."
  }
];

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function matches(rule, query) {
  const target = normalize(query);
  return rule.aliases.some((alias) => target.includes(normalize(alias)));
}

export function lookupApp(query) {
  const rule = APP_RULES.find((entry) => matches(entry, query));
  if (!rule) {
    return {
      query: query || "",
      found: false,
      privacyScore: null,
      platform: "",
      dataCategories: [],
      permissions: [],
      thirdParties: [],
      concerns: [],
      summary: "No local app intelligence record yet. Try a more specific name."
    };
  }

  return {
    query: query || rule.name,
    found: true,
    name: rule.name,
    privacyScore: rule.privacyScore,
    platform: rule.platform,
    dataCategories: rule.dataCategories,
    permissions: rule.permissions,
    thirdParties: rule.thirdParties,
    concerns: rule.concerns,
    summary: rule.summary
  };
}
