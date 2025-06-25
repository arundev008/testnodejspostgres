const DataBase = require("../../db/postgressql");
const {createOrUpdateAddress,validateAddressFields} = require("../common/address");
const jwt = require("jsonwebtoken");
const {today,sanitize,checkMissingFields,formatDateDaysAgo} = require("../common/utils");

/* ---------- helpers ---------- */
const iso = (d) => new Date(d).toISOString().split("T")[0];
const formatDate = (d) => (d ? iso(d) : today());

/* ---------- validation ---------- */
function validateUserFields(obj, allowPartial = false) {
  const required = [
    "user_name",
    "first_name",
    "last_name",
    "type_of_user",
    "email_id",
    "date_of_birth",
    "personal_email_id",
    "contact_number",
    "gender",
  ];

  if (allowPartial) {
    const supplied = required.some((f) => f in obj);
    if (!supplied)
      throw new Error("No user fields provided for partial update");
  } else {
    const missing = checkMissingFields(obj, required);
    if (missing.length)
      throw new Error(`Missing user fields: ${missing.join(", ")}`);
  }
}

/* ---------- POST /user ---------- */
async function postUser(body) {

  validateUserFields(body);
  if (!body.address) throw new Error("Address information is required");
  if ("address_number" in body.address)
    throw new Error("Client cannot set address_number manually");
  validateAddressFields(body.address);
 const dupAny = await DataBase.query(
  `SELECT valid_to FROM master_users WHERE user_name = $1`,
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

  const userData = {
    user_name: sanitize(body.user_name),
    first_name: sanitize(body.first_name),
    middle_name: sanitize(body.middle_name),
    last_name: sanitize(body.last_name),
    type_of_user: sanitize(body.type_of_user),
    email_id: sanitize(body.email_id),
    personal_email_id: sanitize(body.personal_email_id),
    contact_number: sanitize(body.contact_number),
    alt_contact_number: sanitize(body.alt_contact_number),
    gender: sanitize(body.gender),
    date_of_birth: formatDate(body.date_of_birth),
    valid_from: formatDate(body.valid_from),
    valid_to: formatDate(body.valid_to || "9999-12-31"),
  };

  const dummyQuery = `SELECT CAST($1 AS user_type_enum), CAST($2 AS gender_enum)`;
  await DataBase.query(dummyQuery, [userData.type_of_user, userData.gender]);


  const address_number = await createOrUpdateAddress(
    body.address,
    formatDate(body.valid_from),
    formatDate(body.valid_to || "9999-12-31")
  );

  userData.address_number = address_number;

  await DataBase.insert("master_users", userData);

  const token = jwt.sign({ user_name: userData.user_name }, "SmodTiterp@2024", {
    expiresIn: "24h",
  });

  return {
    message: `User '${userData.user_name}' created.`,
    user_name: userData.user_name,
    activation_link: `http://localhost:54467/activate?token=${token}`,
  };
}

/* ---------- GET /user ---------- */
async function getUser({ user_name }) {
  if (!user_name) throw new Error("Missing query parameter: user_name");

   const users = await DataBase.query(
    `SELECT * FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(user_name)]
  );
  if (!users.length) return null;

  const user = {};
  for (const key in users[0]) {
    user[key] = sanitize(users[0][key]);
  }

  const addrRows = await DataBase.query(
    `SELECT * FROM addresses WHERE address_number = $1 AND valid_to >= CURRENT_DATE`,
    [users[0].address_number]
  );

  if (addrRows.length) {
    const cleanedAddr = {};
    for (const key in addrRows[0]) {
      cleanedAddr[key] = sanitize(addrRows[0][key]);
    }
    user.address = cleanedAddr;
  } else {
    user.address = null;
  }

  return user;
}

/* ---------- PUT /user ---------- */
async function putUser(body) {
  const { user_name } = body;
  if (!user_name) throw new Error("Missing field: user_name");

  const existing = await DataBase.query(
    `SELECT * FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(user_name)]
  );
  if (!existing.length) throw new Error(`User '${user_name}' not found`);

  validateUserFields(body); 
   if ("address" in body)
    throw new Error("Address cannot be updated in PUT /user. Use PUT /address");

  const update = { ...body };
  update.valid_from = formatDate(body.valid_from);
  update.valid_to = formatDate(body.valid_to || "9999-12-31");
  Object.keys(update).forEach((k) => (update[k] = sanitize(update[k])));

  if (update.type_of_user || update.gender) {
    const dummyQuery = `SELECT CAST($1 AS user_type_enum), CAST($2 AS gender_enum)`;
    await DataBase.query(dummyQuery, [update.type_of_user, update.gender]);
  }
  
  await DataBase.update("master_users", update, { user_name: sanitize(user_name) });

  return { message: `User '${user_name}' details updated successfully` };
}

/* ---------- PATCH /user ---------- */
async function patchUser(body) {
  const { user_name } = body;
  if (!user_name) throw new Error("Missing field: user_name");

  const existing = await DataBase.query(
    `SELECT * FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(user_name)]
  );
  if (!existing.length) throw new Error(`User '${user_name}' not found`);

  validateUserFields(body, true); // partial allowed

  if ("address" in body)
    throw new Error("Address cannot be patched in PATCH /user. Use PATCH /address");

  const updates = {};
  Object.entries(body).forEach(([k, v]) => {
    if (k !== "user_name" && v !== undefined) {
      updates[k] =
        k === "valid_from" || k === "valid_to" ? formatDate(v) : sanitize(v);
    }
  });

  if (updates.type_of_user || updates.gender) {
    const dummyQuery = `SELECT CAST($1 AS user_type_enum), CAST($2 AS gender_enum)`;
    await DataBase.query(dummyQuery, [updates.type_of_user, updates.gender]);
  }

  if (Object.keys(updates).length) {
    await DataBase.update("master_users", updates, {
      user_name: sanitize(user_name),
    });
  }

  return { message: `User '${user_name}' User details updated successfully` };
}

/* ---------- DELETE /user ---------- */
async function deleteUser({user_name}) {
  if (!user_name) throw new Error("Missing query parameter: user_name");

  const users = await DataBase.query(
    `SELECT * FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(user_name)]
  );
  if (!users.length) throw new Error(`User '${user_name}' not found`);

  const yesterday = formatDateDaysAgo(1);

  await DataBase.update(
    "master_users",
    { valid_to: yesterday },
    { user_name }
  );
  await DataBase.update(
    "addresses",
    { valid_to: yesterday },
    { address_number: users[0].address_number }
  );

  return { message: `User '${user_name}' soft deleted` };
}

module.exports = { postUser, getUser, putUser, patchUser, deleteUser };
