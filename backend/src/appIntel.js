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
    controls: [
      { label: "Account activity controls", detail: "Review order, browsing, and recommendation settings from the account dashboard." },
      { label: "Recommendation settings", detail: "Controls for ad and recommendation personalization may live in account privacy settings." }
    ],
    retention: [
      { label: "Order history", detail: "Retention depends on account, tax, and support requirements." },
      { label: "Browsing activity", detail: "May persist while personalization and recommendations are enabled." }
    ],
    summary: "Amazon combines commerce, logistics, and account data across a large ecosystem."
  },
  {
    name: "NVIDIA",
    aliases: ["nvidia", "nvidia.com"],
    privacyScore: 49,
    platform: "Hardware, software, and developer ecosystem",
    dataCategories: ["Identity", "Device data", "Usage data", "Interaction data"],
    permissions: ["Account access", "Notifications", "Location (support / fraud)"],
    thirdParties: ["Advertising partners", "Consent tools", "Analytics vendors"],
    concerns: ["Analytics", "Marketing", "Third-party partner sharing"],
    controls: [
      { label: "Cookie settings", detail: "Review accept, manage, and privacy choice controls before consenting." },
      { label: "Privacy policy / choices", detail: "Check the privacy and cookie policy for tracking and third-party partner details." }
    ],
    retention: [
      { label: "Usage and interactions", detail: "May be retained for support, analytics, and marketing measurement." }
    ],
    summary: "NVIDIA sites often combine product content with cookie, analytics, and marketing infrastructure."
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
    controls: [
      { label: "Ad preferences", detail: "Controls for ad personalization and off-platform activity are typically in Meta settings." },
      { label: "Activity settings", detail: "Cross-app activity and data-sharing settings are important to review." }
    ],
    retention: [
      { label: "Usage and engagement", detail: "Can be retained while the account and recommendation systems are active." },
      { label: "Shared content", detail: "May persist or be replicated depending on audience and account settings." }
    ],
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
    controls: [
      { label: "Ad and personalization controls", detail: "Review ad personalization, watch history, and interest controls." },
      { label: "Download / delete account path", detail: "Important when you want to export or remove account data." }
    ],
    retention: [
      { label: "Watch and interaction history", detail: "May be retained to support recommendations and account continuity." }
    ],
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
    controls: [
      { label: "Privacy settings", detail: "Review last seen, profile photo, groups, and read-receipt settings." },
      { label: "Account management", detail: "Export and delete-account paths are important to know before you keep using the service." }
    ],
    retention: [
      { label: "Metadata", detail: "Often retained longer than message content and may support safety or service operations." }
    ],
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
    controls: [
      { label: "Location controls", detail: "Foreground and background location settings matter for trip and safety features." },
      { label: "Privacy center", detail: "Check the account privacy page for sharing, marketing, and data export settings." }
    ],
    retention: [
      { label: "Trip history", detail: "Usually retained to support billing, safety, and support workflows." }
    ],
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
    controls: [
      { label: "Training toggle", detail: "Review whether chats or API data can be used for training or improvement." },
      { label: "Temporary chats", detail: "Temporary or ephemeral chats reduce persistence and should be easy to find." },
      { label: "Data controls", detail: "Account settings often contain export, delete, and activity controls." },
      { label: "Delete account path", detail: "Important for removing stored history and account data." }
    ],
    retention: [
      { label: "Chats and prompts", detail: "Retention can differ when training, safety review, or enterprise settings are enabled." }
    ],
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
    controls: [
      { label: "Activity controls", detail: "Web, app, and account activity settings can affect personalization and training." },
      { label: "Privacy dashboard", detail: "Review history, download, and delete paths in Microsoft privacy settings." }
    ],
    retention: [
      { label: "Service activity", detail: "May persist across Microsoft services unless retention settings or account deletion apply." }
    ],
    summary: "Microsoft services are useful but frequently come with broad account-scoped permissions."
  },
  {
    name: "GitHub",
    aliases: ["github", "github.com"],
    privacyScore: 57,
    platform: "Developer hosting, identity, and collaboration",
    dataCategories: ["Repository metadata", "Account data", "Telemetry", "Usage data"],
    permissions: ["Repository access", "Account access", "Workflow permissions"],
    thirdParties: ["GitHub services", "Microsoft services", "Analytics vendors"],
    concerns: ["Telemetry", "Code visibility", "Enterprise data boundaries"],
    controls: [
      { label: "Usage and telemetry settings", detail: "Review whether product telemetry is enabled for your account or org." },
      { label: "Organization policies", detail: "Enterprise settings can affect data retention and workflow visibility." }
    ],
    retention: [
      { label: "Repository history", detail: "Persists until deleted or archived according to repository and organization policy." }
    ],
    summary: "GitHub is a collaboration platform where repository visibility and telemetry settings matter."
  },
  {
    name: "Anthropic",
    aliases: ["anthropic", "claude", "claude.ai"],
    privacyScore: 55,
    platform: "AI assistants and developer APIs",
    dataCategories: ["Prompts", "Conversation history", "Usage data", "Account data"],
    permissions: ["Account access", "Files or documents when uploaded", "Notifications"],
    thirdParties: ["Cloud infrastructure", "Safety and support vendors"],
    concerns: ["Training opt-in", "Feedback processing", "Conversation retention"],
    controls: [
      { label: "Training toggle", detail: "Check whether your chats may be used for model training or improvement." },
      { label: "Feedback controls", detail: "Feedback flows can sometimes sit outside the main privacy setting." },
      { label: "Delete account path", detail: "Good to confirm before you rely on the service for sensitive work." }
    ],
    retention: [
      { label: "Chat history", detail: "Retained until the account settings or product policy say otherwise." },
      { label: "Training-enabled data", detail: "Retention can change if you opt into training or improvement programs." }
    ],
    summary: "Anthropic-style products are sensitive because prompts and feedback can carry personal or work data."
  },
  {
    name: "Google",
    aliases: ["google", "gemini", "google workspace", "gmail", "drive", "calendar", "photos"],
    privacyScore: 46,
    platform: "Search, productivity, ads, and AI",
    dataCategories: ["Web activity", "Location history", "Ad interests", "Emails", "Files", "Calendar"],
    permissions: ["Mail", "Drive", "Calendar", "Contacts", "Location history", "Ad personalization"],
    thirdParties: ["Google services", "Advertising partners", "Analytics vendors"],
    concerns: ["Web activity tracking", "Gemini training", "Workspace data boundaries", "Ads personalization"],
    controls: [
      { label: "Web & App Activity", detail: "Review history and whether it contributes to personalization or AI improvements." },
      { label: "Location history", detail: "Separate from basic location permission and worth checking independently." },
      { label: "Ads personalization", detail: "Controls whether ad systems use activity across Google services." }
    ],
    retention: [
      { label: "Activity data", detail: "Retention may vary across products and account settings." },
      { label: "Workspace data", detail: "Enterprise retention and admin policies may override consumer settings." }
    ],
    summary: "Google services often combine search, activity, ads, and productivity settings across one account."
  },
  {
    name: "Singtel",
    aliases: ["singtel", "singtel.com"],
    privacyScore: 44,
    platform: "Telecom, services, and customer support",
    dataCategories: ["Identity", "Usage data", "Support data", "Device identifiers"],
    permissions: ["Account access", "Location (service support)", "Notifications"],
    thirdParties: ["Analytics vendors", "Support vendors", "Advertising partners"],
    concerns: ["Cookie and analytics sharing", "Support tooling", "Ad measurement"],
    controls: [
      { label: "Cookie policy", detail: "Review cookie and privacy settings, especially on consumer-facing pages." },
      { label: "Account privacy settings", detail: "Check any personal data protection controls in account pages." }
    ],
    retention: [
      { label: "Support and usage data", detail: "May persist for service operations, diagnostics, and account history." }
    ],
    summary: "Singtel combines telecom services with marketing, analytics, and support infrastructure."
  },
  {
    name: "Meta",
    aliases: ["meta", "facebook", "instagram", "meta ai"],
    privacyScore: 30,
    platform: "Social media, messaging, and advertising",
    dataCategories: ["Identity", "Contacts", "Photos and videos", "Usage data", "Device identifiers", "Cross-platform activity"],
    permissions: ["Camera", "Microphone", "Contacts", "Location"],
    thirdParties: ["Meta advertising systems", "Analytics vendors", "Measurement partners"],
    concerns: ["AI training", "Cross-platform sharing", "Ad targeting", "Behavioral profiling"],
    controls: [
      { label: "AI training settings", detail: "Check whether activity, posts, or chats can be used to improve AI systems." },
      { label: "Cross-platform account center", detail: "Shared settings can affect Instagram, Facebook, and other Meta services." },
      { label: "Ad preferences", detail: "Worth reviewing because ad targeting is central to the ecosystem." }
    ],
    retention: [
      { label: "Cross-platform signals", detail: "May persist across services as long as account-linking remains active." }
    ],
    summary: "Meta products commonly combine social activity, device data, and advertising systems across services."
  },
  {
    name: "GitHub Copilot",
    aliases: ["copilot", "github copilot", "copilot.github.com"],
    privacyScore: 51,
    platform: "Developer tooling and AI coding assistance",
    dataCategories: ["Code snippets", "Telemetry", "Usage data", "Repository metadata"],
    permissions: ["Repository access", "Editor integration", "Telemetry opt-in"],
    thirdParties: ["GitHub services", "Microsoft services", "Analytics vendors"],
    concerns: ["Code retention", "Telemetry", "Training settings", "Enterprise boundary questions"],
    controls: [
      { label: "Telemetry controls", detail: "Check whether usage and editor telemetry are sent for product improvement." },
      { label: "Training settings", detail: "Important for code generation products that may learn from prompts or snippets." },
      { label: "Enterprise policy", detail: "Organization settings can change retention and model training behavior." }
    ],
    retention: [
      { label: "Code and prompts", detail: "Retention depends on product settings, org policy, and plan type." }
    ],
    summary: "Copilot-style tools should clearly separate code assistance, telemetry, and training behavior."
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
      controls: [],
      retention: [],
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
    controls: rule.controls || [],
    retention: rule.retention || [],
    summary: rule.summary
  };
}
