export const SAVED_CONTACT_KEY = "cdp-checkout-contact";
const MAX_AGE = 90 * 24 * 60 * 60 * 1000;
export type CheckoutContact = {
  email: string; firstName: string; lastName: string; documentNumber: string;
  phone: string; cep: string; withoutNumber: boolean; sameInvoiceData: boolean;
  shippingMethod: "pac" | "sedex";
  address: { street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
};
export const normalizeContactEmail = (email: string) => email.trim().toLowerCase();

// Explicit whitelist: payment data must never enter this browser preference.
function sanitize(value: unknown): CheckoutContact | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!v.address || typeof v.address !== "object") return null;
  const a = v.address as Record<string, unknown>;
  const fields = ["email", "firstName", "lastName", "documentNumber", "phone", "cep"] as const;
  const addressFields = ["street", "number", "complement", "neighborhood", "city", "state"] as const;
  if (fields.some(k => typeof v[k] !== "string" || (v[k] as string).length > 254)
    || addressFields.some(k => typeof a[k] !== "string" || (a[k] as string).length > 254)
    || typeof v.withoutNumber !== "boolean") return null;
  const contact = Object.fromEntries(fields.map(k => [k, (v[k] as string).trim()])) as Pick<CheckoutContact,
    "email" | "firstName" | "lastName" | "documentNumber" | "phone" | "cep">;
  const address = Object.fromEntries(addressFields.map(k => [k, (a[k] as string).trim()])) as CheckoutContact["address"];
  contact.email = normalizeContactEmail(contact.email);
  contact.documentNumber = contact.documentNumber.replace(/\D/g, "");
  contact.phone = contact.phone.replace(/\D/g, "");
  contact.cep = contact.cep.replace(/\D/g, "");
  address.state = address.state.toUpperCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || !contact.firstName || !contact.lastName
    || !/^(\d{11}|\d{14})$/.test(contact.documentNumber) || !/^\d{10,11}$/.test(contact.phone)
    || !/^\d{8}$/.test(contact.cep) || !address.street || !address.neighborhood || !address.city
    || !/^[A-Z]{2}$/.test(address.state) || (!v.withoutNumber && !address.number)) return null;
  const shippingMethod = v.shippingMethod === "sedex" ? "sedex" : v.shippingMethod === "pac" ? "pac" : null;
  if (!shippingMethod) return null;
  return {
    ...contact, address, withoutNumber: v.withoutNumber,
    sameInvoiceData: typeof v.sameInvoiceData === "boolean" ? v.sameInvoiceData : true,
    shippingMethod,
  };
}

export function readCheckoutContact(storage: Pick<Storage, "getItem">, email: string, now = Date.now()): CheckoutContact | null {
  try {
    const saved = JSON.parse(storage.getItem(SAVED_CONTACT_KEY) ?? "null");
    if (saved?.version !== 3 || typeof saved.savedAt !== "number" || !Number.isFinite(saved.savedAt)
      || now - saved.savedAt > MAX_AGE || saved.savedAt > now) return null;
    const contact = sanitize(saved.contact);
    return contact?.email === normalizeContactEmail(email) ? contact : null;
  } catch { return null; }
}

export function saveCheckoutContact(storage: Pick<Storage, "setItem">, value: CheckoutContact, now = Date.now()): boolean {
  try {
    const contact = sanitize(value);
    if (!contact) return false;
    storage.setItem(SAVED_CONTACT_KEY, JSON.stringify({ version: 3, savedAt: now, contact }));
    return true;
  } catch { return false; }
}
