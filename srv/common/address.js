const DataBase = require("../../db/postgressql");
const {
  sanitize,
  today,
  checkMissingFields,
  formatDateDaysAgo,
} = require("../common/utils");

/* ------------ Validation Helper ------------ */
function validateAddressFields(address, allowPartial = false) {
  const required = [
    "name",
    "name2",
    "street_address",
    "city",
    "state_province",
    "postal_code",
    "country",
  ];

  if (allowPartial) {
    const provided = required.some((f) => f in address);
    if (!provided)
      throw new Error("No address fields provided for partial update");
  } else {
    const missing = checkMissingFields(address, required);
    if (missing.length)
      throw new Error(`Missing address fields: ${missing.join(", ")}`);
  }
}

/* ------------ Create or Update Address ------------ */
async function createOrUpdateAddress(address, valid_from, valid_to) {
  const san = {};
  Object.entries(address).forEach(([k, v]) => (san[k] = sanitize(v)));
  san.valid_from = valid_from || today();
  san.valid_to = valid_to || "9999-12-31";

  if (!san.address_number) {
    const all = await DataBase.readAll("addresses");
    const next =
      all.length > 0 ? Math.max(...all.map((a) => +a.address_number)) + 1 : 1;
    san.address_number = next.toString();
    await DataBase.insert("addresses", san);
  } else {
    await DataBase.update("addresses", san, {
      address_number: san.address_number,
    });
  }
  return san.address_number;
}

/* ------------ Read Address ------------ */
async function getAddress({ address_number }) {
  if (!address_number) throw new Error("Missing query parameter: address_number");

  const rows = await DataBase.read("addresses", {
    address_number: sanitize(address_number),
  });
  return rows.length ? rows[0] : null;
}

/* ------------ Update Address ------------ */
async function updateAddress(data) {
  const { address_number } = data;
  if (!address_number) throw new Error("Missing field: address_number");

  const existing = await DataBase.read("addresses", {
    address_number: sanitize(address_number),
  });
  if (!existing.length)
    throw new Error(`Address '${address_number}' not found`);

  validateAddressFields(data);

  const payload = {
    name: sanitize(data.name),
    name2: sanitize(data.name2),
    street_address: sanitize(data.street_address),
    city: sanitize(data.city),
    state_province: sanitize(data.state_province),
    postal_code: sanitize(data.postal_code),
    country: sanitize(data.country),
    valid_from: data.valid_from || today(),
    valid_to: data.valid_to || "9999-12-31",
  };

  await DataBase.update("addresses", payload, {
    address_number: sanitize(address_number),
  });
  return { message: `Address '${address_number}' updated` };
}

/* ------------ Delete Address (soft) ------------ */
async function deleteAddress(address_number) {
  if (!address_number) throw new Error("Missing field: address_number");

  const exists = await DataBase.read("addresses", {
    address_number: sanitize(address_number),
  });
  if (!exists.length)
    throw new Error(`Address '${address_number}' not found`);

  await DataBase.update(
    "addresses",
    { valid_to: formatDateDaysAgo(1) },
    { address_number: sanitize(address_number) }
  );
  return { message: `Address '${address_number}' soft deleted` };
}

module.exports = {
  createOrUpdateAddress,
  validateAddressFields,
  getAddress,
  updateAddress,
  deleteAddress,
};
