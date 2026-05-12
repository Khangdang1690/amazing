function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromPhone: process.env.TWILIO_FROM_PHONE ?? "",
  allowedAdminEmails: (process.env.ALLOWED_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  shopTimezone: process.env.SHOP_TIMEZONE ?? "America/Los_Angeles",
  shopPhoneE164: process.env.SHOP_PHONE_E164 ?? "+17145551234",
  shopName: process.env.SHOP_NAME ?? "Amazing Hair Design",
  shopAddress:
    process.env.SHOP_ADDRESS ?? "9100 Bolsa Ave, Westminster, CA 92683",
  shopGmapsEmbed:
    process.env.SHOP_GMAPS_EMBED ??
    "https://www.google.com/maps?q=Amazing+Hair+Design+Westminster+CA&output=embed",
  shopInstagram:
    process.env.SHOP_INSTAGRAM ??
    "https://www.instagram.com/tommyamazinghair/",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  composioApiKey: process.env.COMPOSIO_API_KEY ?? "",
  composioUserId: process.env.COMPOSIO_USER_ID ?? "",
  composioGcalAuthConfigId: process.env.COMPOSIO_GCAL_AUTH_CONFIG_ID ?? "",
};

export const SHOP = {
  name: env.shopName,
  address: env.shopAddress,
  phoneE164: env.shopPhoneE164,
  phoneDisplay: formatPhoneDisplay(env.shopPhoneE164),
  timezone: env.shopTimezone,
  gmapsEmbed: env.shopGmapsEmbed,
  instagram: env.shopInstagram,
  instagramHandle: "tommyamazinghair",
};
