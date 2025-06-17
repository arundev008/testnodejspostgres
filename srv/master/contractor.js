const DataBase = require("../../db/postgressql");
const {
  sanitize,
  today,
  checkMissingFields,
  formatDateDaysAgo,
} = require("../common/utils");

const ALLOWED_TYPES = ["C", "F"];
const iso = (d) => new Date(d).toISOString().split("T")[0];
const fmt = (d) => (d ? iso(d) : today());

function validateEnum(type) {
  if (!ALLOWED_TYPES.includes(type))
    throw new Error(`type_of_user must be 'C' or 'F'`);
}

async function ensureUserExists(user_name) {
  const rows = await DataBase.read("master_users", { user_name: sanitize(user_name) });
  if (!rows.length) throw new Error(`user_name '${user_name}' not found`);
  return rows[0]; // return master_user row for ownership check
}

async function ensureAddressExists(address_number) {
  const rows = await DataBase.read("addresses", {
    address_number: sanitize(address_number),
  });
  if (!rows.length) throw new Error(`Address '${address_number}' not found`);
  return rows[0]; // return address row
}

async function ensureAddressBelongsToUser({ user_row, address_row }) {
  if (sanitize(user_row.address_number) !== sanitize(address_row.address_number)) {
    throw new Error(
      `Address '${address_row.address_number}' does not belong to user '${user_row.user_name}'`
    );
  }
}

/* ──────────────────────────────────
   POST  /contractor
────────────────────────────────── */
async function postContractor(body) {
  /* required fields */
  const required = [
    "external_emp_id",
    "user_name",
    "type_of_user",
    "beneficiary_address_number",
    "tax_number",
    "agreed_amount",
  ];
  const missing = checkMissingFields(body, required);
  if (missing.length) throw new Error(`Missing fields: ${missing.join(", ")}`);

  validateEnum(body.type_of_user);

  const userRow   = await ensureUserExists(body.user_name);
  const addrRow   = await ensureAddressExists(body.beneficiary_address_number);
  await ensureAddressBelongsToUser({ user_row: userRow, address_row: addrRow });

  const dup = await DataBase.read("contractor_users", {
    external_emp_id: sanitize(body.external_emp_id),
  });
  if (dup.length) throw new Error(`external_emp_id '${body.external_emp_id}' already exists`);

  /* insert */
  const row = {
    external_emp_id:          sanitize(body.external_emp_id),
    user_name:                sanitize(body.user_name),
    type_of_user:             sanitize(body.type_of_user),
    valid_from:               fmt(body.valid_from),
    valid_to:                 fmt(body.valid_to || "9999-12-31"),
    beneficiary_address_number: sanitize(body.beneficiary_address_number),
    tax_number:               sanitize(body.tax_number),
    agreed_amount:            Number(body.agreed_amount),
  };

  await DataBase.insert("contractor_users", row);
  return { message: `Contractor '${row.external_emp_id}' created` };
}

/* ──────────────────────────────────
   GET  /contractor?external_emp_id=…
────────────────────────────────── */
async function getContractor({ external_emp_id }) {
  if (!external_emp_id) throw new Error("Missing query parameter: external_emp_id");

  const rows = await DataBase.read("contractor_users", {
    external_emp_id: sanitize(external_emp_id),
  });
  if (!rows.length) return null;

  const contractor = rows[0];
  const address    = await DataBase.read("addresses", {
    address_number: contractor.beneficiary_address_number,
  });
  contractor.beneficiary_address = address.length ? address[0] : null;
  return contractor;
}

/* ──────────────────────────────────
   PUT  /contractor   (full update)
────────────────────────────────── */
async function updateContractor(body) {
  const { external_emp_id } = body;
  if (!external_emp_id) throw new Error("Missing field: external_emp_id");

  const exists = await DataBase.read("contractor_users", {
    external_emp_id: sanitize(external_emp_id),
  });
  if (!exists.length) throw new Error(`Contractor '${external_emp_id}' not found`);

  /* same validation rules as POST */
  validateEnum(body.type_of_user);
  const userRow = await ensureUserExists(body.user_name);
  const addrRow = await ensureAddressExists(body.beneficiary_address_number);
  await ensureAddressBelongsToUser({ user_row: userRow, address_row: addrRow });

  const update = {
    user_name:                 sanitize(body.user_name),
    type_of_user:              sanitize(body.type_of_user),
    valid_from:                fmt(body.valid_from || exists[0].valid_from),
    valid_to:                  fmt(body.valid_to   || exists[0].valid_to),
    beneficiary_address_number: sanitize(body.beneficiary_address_number),
    tax_number:                sanitize(body.tax_number),
    agreed_amount:             Number(body.agreed_amount),
  };

  await DataBase.update(
    "contractor_users",
    update,
    { external_emp_id: sanitize(external_emp_id) }
  );

  return { message: `Contractor '${external_emp_id}' updated` };
}

/* ──────────────────────────────────
   DELETE  /contractor?external_emp_id=…
   (soft delete)
────────────────────────────────── */
async function deleteContractor({ external_emp_id }) {
  if (!external_emp_id) throw new Error("Missing query parameter: external_emp_id");

  const rows = await DataBase.read("contractor_users", {
    external_emp_id: sanitize(external_emp_id),
  });
  if (!rows.length) throw new Error(`Contractor '${external_emp_id}' not found`);

  const yesterday = formatDateDaysAgo(1);
  await DataBase.update(
    "contractor_users",
    { valid_to: yesterday },
    { external_emp_id: sanitize(external_emp_id) }
  );

  /* also soft‑delete address */
  await DataBase.update(
    "addresses",
    { valid_to: yesterday },
    { address_number: rows[0].beneficiary_address_number }
  );

  return { message: `Contractor '${external_emp_id}' soft‑deleted` };
}

/* ──────────────────────────────────
   EXPORTS
────────────────────────────────── */
module.exports = {
  postContractor,
  getContractor,
  updateContractor,
  deleteContractor,
};
