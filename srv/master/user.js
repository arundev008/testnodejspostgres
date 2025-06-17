const DataBase = require("../../db/postgressql");
const {
  createOrUpdateAddress,
  validateAddressFields,
} = require("../common/address");
const jwt = require("jsonwebtoken");
const {
  today,
  sanitize,
  checkMissingFields,
  formatDateDaysAgo,
} = require("../common/utils");

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

  const dup = await DataBase.read("master_users", {
    user_name: sanitize(body.user_name),
  });
  if (dup.length) throw new Error(`User '${body.user_name}' already exists`);

  const address_number = await createOrUpdateAddress(
    body.address,
    formatDate(body.valid_from),
    formatDate(body.valid_to || "9999-12-31")
  );

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
    address_number,
    valid_from: formatDate(body.valid_from),
    valid_to: formatDate(body.valid_to || "9999-12-31"),
  };

  await DataBase.insert("master_users", userData);

  const token = jwt.sign({ user_name: userData.user_name }, "SmodTiterp@2024", {
    expiresIn: "24h",
  });

  return {
    message: "User created (activation link generated)",
    activation_link: `http://localhost:54467/activate?token=${token}`,
  };
}

/* ---------- GET /user ---------- */
async function getUser({ user_name }) {
  if (!user_name) throw new Error("Missing query parameter: user_name");

  const users = await DataBase.read("master_users", {
    user_name: sanitize(user_name),
  });
  if (!users.length) return null;

  const user = users[0];
  const addr = await DataBase.read("addresses", {
    address_number: user.address_number,
  });
  user.address = addr.length ? addr[0] : null;

  return user;
}

/* ---------- PUT /user ---------- */
async function updateUser(body) {
  const { user_name } = body;
  if (!user_name) throw new Error("Missing field: user_name");

  const existing = await DataBase.read("master_users", {
    user_name: sanitize(user_name),
  });
  if (!existing.length) throw new Error(`User '${user_name}' not found`);

  validateUserFields(body); // full set required

  const address_number = existing[0].address_number;

  /* update or create address if supplied */
  if (body.address) {
    if ("address_number" in body.address)
      throw new Error("Client cannot set address_number manually");
    validateAddressFields(body.address);
    await createOrUpdateAddress(
      { ...body.address, address_number },
      body.address.valid_from || body.valid_from || today(),
      body.address.valid_to || body.valid_to || "9999-12-31"
    );
  }

  /* update user */
  const update = { ...body };
  delete update.address;
  update.valid_from = formatDate(body.valid_from);
  update.valid_to = formatDate(body.valid_to || "9999-12-31");

  Object.keys(update).forEach((k) => (update[k] = sanitize(update[k])));

  await DataBase.update("master_users", update, {
    user_name: sanitize(user_name),
  });

  return { message: `User '${user_name}' updated successfully` };
}

/* ---------- PATCH /user ---------- */
async function patchUser(body) {
  const { user_name } = body;
  if (!user_name) throw new Error("Missing field: user_name");

  const existing = await DataBase.read("master_users", {
    user_name: sanitize(user_name),
  });
  if (!existing.length) throw new Error(`User '${user_name}' not found`);

  validateUserFields(body, true); // partial allowed

  const updates = {};
  Object.entries(body).forEach(([k, v]) => {
    if (k !== "user_name" && k !== "address" && v !== undefined) {
      updates[k] =
        k === "valid_from" || k === "valid_to" ? formatDate(v) : sanitize(v);
    }
  });

  if (Object.keys(updates).length)
    await DataBase.update("master_users", updates, {
      user_name: sanitize(user_name),
    });

  if (body.address) {
    if ("address_number" in body.address)
      throw new Error("Client cannot set address_number manually");
    validateAddressFields(body.address, true);
    await DataBase.update(
      "addresses",
      body.address,
      { address_number: existing[0].address_number }
    );
  }

  return { message: `User '${user_name}' patched successfully` };
}

/* ---------- DELETE /user ---------- */
async function deleteUser(user_name) {
  if (!user_name) throw new Error("Missing query parameter: user_name");

  const users = await DataBase.read("master_users", { user_name });
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

module.exports = { postUser, getUser, updateUser, patchUser, deleteUser };
