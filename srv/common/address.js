const DataBase = require("../../db/postgressql");
const {
  sanitize,
  today,
  checkMissingFields,
  formatDateDaysAgo,
} = require("../common/utils");

/* ───── validation ───── */
function validateAddressFields(addr, allowPartial = false) {
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
    if (!required.some((f) => f in addr))
      throw new Error("No address fields provided for partial update");
  } else {
    const miss = checkMissingFields(addr, required);
    if (miss.length) throw new Error(`Missing address fields: ${miss.join(", ")}`);
  }
}

/* ───── create / update (internal helper) ───── */
async function createOrUpdateAddress(addr, valid_from, valid_to, ) {
  const a = {};
  Object.entries(addr).forEach(([k, v]) => (a[k] = sanitize(v)));
  a.valid_from = valid_from || today();
  a.valid_to   = valid_to   || "9999-12-31";

  if (!a.address_number) {
    const rows = await DataBase.readAll("addresses");
    const next = rows.length ? Math.max(...rows.map(r => +r.address_number)) + 1 : 1;
    a.address_number = String(next);
    await DataBase.insert("addresses", a);
  } else {
    await DataBase.update("addresses", a, { address_number: a.address_number });
  }
  return a.address_number;
}

async function getAddress({ address_number }) {
  if (!address_number) throw new Error("Missing query parameter: address_number");

  const rows = await DataBase.query(
    `SELECT * FROM addresses
     WHERE address_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(address_number)]
  );
  return rows.length ? rows[0] : null;
}

async function putAddress(data) {
  validateAddressFields(data);
  const { address_number } = data;
  if (!address_number) throw new Error("Missing field: address_number");

  const exists = await DataBase.query(
    `SELECT 1 FROM addresses
     WHERE address_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(address_number)]
  );
  if (!exists.length) throw new Error(`Address '${address_number}' not found`);

  const up = { ...data };
  up.valid_from = up.valid_from || today();
  up.valid_to   = up.valid_to   || "9999-12-31";
  Object.keys(up).forEach(k => up[k] = sanitize(up[k]));

  await DataBase.update("addresses", up, { address_number: sanitize(address_number) });
  return { message: `Address '${address_number}' updated` };
}

async function patchAddress(data) {
  const { address_number } = data;
  if (!address_number) throw new Error("Missing field: address_number");

  const exists = await DataBase.query(
    `SELECT 1 FROM addresses
     WHERE address_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(address_number)]
  );
  if (!exists.length) throw new Error(`Address '${address_number}' not found`);

  validateAddressFields(data, true);

  const up = {};
  Object.entries(data).forEach(([k, v]) => {
    if (k !== "address_number" && v !== undefined) up[k] = sanitize(v);
  });

  if (Object.keys(up).length)
    await DataBase.update("addresses", up, { address_number: sanitize(address_number) });

  return { message: `Address '${address_number}' patched` };
}

async function deleteAddress({ address_number }) {
  if (!address_number) throw new Error("Missing query parameter: address_number");

  const exists = await DataBase.query(
    `SELECT 1 FROM addresses
     WHERE address_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(address_number)]
  );
  if (!exists.length) throw new Error(`Address '${address_number}' not found`);

  await DataBase.update(
    "addresses",
    { valid_to: formatDateDaysAgo(1) },
    { address_number: sanitize(address_number) }
  );
  return { message: `Address '${address_number}' soft-deleted` };
}

module.exports = {
 createOrUpdateAddress, validateAddressFields,
 getAddress, putAddress, patchAddress, deleteAddress,
};
