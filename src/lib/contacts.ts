// The single place the header, footer and /about read their contacts from.
// Deliberately no email: until there's a real address, the contact form on
// /about is the written channel (see src/lib/mail.ts for where it lands).
export const CONTACTS = {
  brand: "Хубавото балонче",
  phone: "+359 89 695 0503",
  phoneHref: "tel:+359896950503",
  // Opens a chat with that number in Viber. It only does anything when Viber
  // is installed, so it's always a separate button — the number itself stays a
  // plain tel: link that works everywhere.
  viberHref: "viber://chat?number=%2B359896950503",
  // m.me takes the Facebook page id, same id as the facebook link below.
  messengerHref: "https://m.me/61558029231145",
  tiktok: "https://www.tiktok.com/@lliyya",
  facebook: "https://www.facebook.com/profile.php?id=61558029231145",
  city: "Варна",
};
