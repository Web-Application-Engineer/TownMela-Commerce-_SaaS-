const GUEST_ID_STORAGE_KEY = "townmelaGuestId";

const GUEST_ID_PATTERN =
  /^guest_[a-zA-Z0-9_-]{8,120}$/;

/* =========================================================
   CREATE A NEW SECURE GUEST ID
========================================================= */

function createGuestId(): string {
  let randomValue: string;

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    randomValue = crypto
      .randomUUID()
      .replaceAll("-", "");
  } else {
    randomValue = `${Date.now().toString(
      36
    )}${Math.random().toString(36).slice(2)}`;
  }

  return `guest_${randomValue}`;
}

/* =========================================================
   VALIDATE GUEST ID
========================================================= */

export function isValidGuestId(
  guestId: string | null | undefined
): guestId is string {
  if (!guestId) {
    return false;
  }

  return GUEST_ID_PATTERN.test(
    guestId.trim()
  );
}

/* =========================================================
   GET EXISTING GUEST ID
========================================================= */

export function getGuestId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedGuestId = window.localStorage.getItem(
    GUEST_ID_STORAGE_KEY
  );

  if (!isValidGuestId(storedGuestId)) {
    return null;
  }

  return storedGuestId.trim();
}

/* =========================================================
   GET OR CREATE GUEST ID
========================================================= */

export function getOrCreateGuestId():
  | string
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existingGuestId = getGuestId();

  if (existingGuestId) {
    return existingGuestId;
  }

  const newGuestId = createGuestId();

  window.localStorage.setItem(
    GUEST_ID_STORAGE_KEY,
    newGuestId
  );

  return newGuestId;
}