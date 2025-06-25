const DataBase = require("../../db/postgressql");
const { sanitize, today, checkMissingFields } = require("../common/utils");
const {
  createOrUpdateAddress,
  validateAddressFields,
} = require("../common/address");

const PREFIX = { C: "C", F: "F" };
const pad = (n) => n.toString().padStart(9, "0");

/* ---------------- Generate external_emp_id ---------------- */
async function nextExternalEmpId(type_of_user) {
  const prefix = PREFIX[type_of_user];
  if (!prefix) throw new Error(`Unsupported contractor type '${type_of_user}'`);

  const rows = await DataBase.readAll("contractor_users");
  const maxNum = rows
    .filter((r) => r.external_emp_id?.startsWith(prefix))
    .reduce((m, r) => {
      const n = parseInt(r.external_emp_id.slice(1), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);

  return `${prefix}${pad(maxNum + 1)}`;
}

/* ---------------- POST: create contractor user ---------------- */
async function postContractor(body) {
  const required = ["user_name", "type_of_user", "tax_number", "agreed_amount", "address"];
  const miss = checkMissingFields(body, required);
  if (miss.length) throw new Error(`Missing fields: ${miss.join(", ")}`);

  // Validate contractor type
  if (!["C", "F"].includes(body.type_of_user)) {
    throw new Error(`Invalid type_of_user '${body.type_of_user}'. Must be 'C' or 'F'`);
  }

  // Validate user exists and is active
  const user = await DataBase.query(
    `SELECT 1 FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(body.user_name)]
  );
  if (!user.length) {
    throw new Error(`User '${body.user_name}' does not exist or is inactive`);
  }

  // Prevent duplicate contractor
 const dupAny = await DataBase.query(
  `SELECT valid_to FROM contractor_users WHERE user_name = $1`,
  [sanitize(body.user_name)]
);
if (dupAny.length) {
  const isSoftDeleted = new Date(dupAny[0].valid_to) < new Date();
  if (isSoftDeleted) {
    throw new Error(`User '${body.user_name}' was previously deleted. Please choose another user name.`);
  } else {
    throw new Error(`User '${body.user_name}' already exists. Please choose another user name.`);
  }
}

  // Validate and create address
  validateAddressFields(body.address);
  const address_number = await createOrUpdateAddress(body.address);

  // Generate external_emp_id
  const external_emp_id = await nextExternalEmpId(body.type_of_user);

  const row = {
    external_emp_id,
    user_name: sanitize(body.user_name),
    type_of_user: sanitize(body.type_of_user),
    tax_number: sanitize(body.tax_number),
    agreed_amount: parseFloat(body.agreed_amount),
    valid_from: body.valid_from || today(),
    valid_to: body.valid_to || "9999-12-31",
    beneficiary_address_number: address_number,
  };

  await DataBase.insert("contractor_users", row);

  return {
    message: "Contractor user created",
    external_emp_id,
  };
}

/* ---------------- PUT: update contractor user (excluding address) ---------------- */
async function putContractor(data) {
  const { external_emp_id } = data;
  if (!external_emp_id) throw new Error("Missing field: external_emp_id");

  const exists = await DataBase.query(
    `SELECT 1 FROM contractor_users WHERE external_emp_id = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(external_emp_id)]
  );
  if (!exists.length) {
    throw new Error(`Contractor '${external_emp_id}' not found or inactive`);
  }

  const up = {};
  if (data.tax_number !== undefined) up.tax_number = sanitize(data.tax_number);
  if (data.agreed_amount !== undefined) up.agreed_amount = parseFloat(data.agreed_amount);
  up.valid_from = data.valid_from || today();
  up.valid_to = data.valid_to || "9999-12-31";

  await DataBase.update("contractor_users", up, {
    external_emp_id: sanitize(external_emp_id),
  });

  return { message: `Contractor '${external_emp_id}' updated` };
}

/* ---------------- GET: fetch contractor user ---------------- */
async function getContractor(query) {
  const { external_emp_id } = query;
  if (!external_emp_id) {
    throw new Error("Missing query parameter: external_emp_id");
  }

  const rows = await DataBase.query(
    `SELECT * FROM contractor_users 
     WHERE external_emp_id = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(external_emp_id)]
  );

  return rows.length ? rows[0] : null;
}

/* ---------------- DELETE: soft-delete contractor user ---------------- */
async function deleteContractor({ external_emp_id }) {
  if (!external_emp_id) throw new Error("Missing field: external_emp_id");

  const exists = await DataBase.query(
    `SELECT 1 FROM contractor_users 
     WHERE external_emp_id = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(external_emp_id)]
  );
  if (!exists.length) throw new Error(`Contractor '${external_emp_id}' not found`);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formatted = yesterday.toISOString().split("T")[0];

  await DataBase.update(
    "contractor_users",
    { valid_to: formatted },
    { external_emp_id: sanitize(external_emp_id) }
  );

  return {
    message: `Contractor '${external_emp_id}' soft-deleted )`,
  };
}

module.exports = {
  postContractor,
  putContractor,
  getContractor,
  deleteContractor,
};
