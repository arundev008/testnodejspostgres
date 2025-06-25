const DataBase = require("../../db/postgressql");
const { sanitize, today, checkMissingFields } = require("../common/utils");

const PREFIX = { I: "D", C: "C", F: "F" };

const pad = (n) => n.toString().padStart(9, "0");

async function nextEmployeeNumber(type_of_user) {
  const prefix = PREFIX[type_of_user];
  if (!prefix) throw new Error(`Unsupported type_of_user '${type_of_user}'`);

  const rows = await DataBase.readAll("employees");
  const maxNum = rows
    .filter((r) => r.employee_number?.startsWith(prefix))
    .reduce((m, r) => {
      const n = parseInt(r.employee_number.slice(1), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);

  return `${prefix}${pad(maxNum + 1)}`;
}

/* ---------------- POST handler ---------------- */
async function postEmployee(body) {
  const req = ["user_name", "department", "date_of_joining", "designation"];
  const miss = checkMissingFields(body, req);
  if (miss.length) throw new Error(`Missing fields: ${miss.join(", ")}`);

 const userRows = await DataBase.query(
    `SELECT * FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(body.user_name)]
  );
  if (!userRows.length)
    throw new Error(`user_name '${body.user_name}' does not exist`);

  const dup = await DataBase.query(
    `SELECT * FROM employees WHERE user_name = $1`,
    [sanitize(body.user_name)]
  );
  if (dup.length) {
    const existingEmpNo = dup[0].employee_number;
    const wasActive = new Date(dup[0].valid_to) >= new Date();
    throw new Error(
          `An employee record already exists for user_name '${body.user_name}' with employee_number '${existingEmpNo}' and is ${wasActive ? "active" : "soft-deleted"}`
    );
  }

  const type_of_user = userRows[0].type_of_user?.trim();
  const employee_number = await nextEmployeeNumber(type_of_user);

  if (body.manager_employee_id) {
    const mgr = await DataBase.query(
      `SELECT * FROM employees WHERE employee_number = $1 AND valid_to >= CURRENT_DATE`,
      [sanitize(body.manager_employee_id)]
    );
    if (!mgr.length)
      throw new Error(`manager_employee_id '${body.manager_employee_id}' not found or inactive`);
  }

  const row = {
    employee_number,
    user_name: sanitize(body.user_name),
    department: sanitize(body.department),
    date_of_joining: body.date_of_joining,
    designation: sanitize(body.designation),
    manager_employee_id: body.manager_employee_id
      ? sanitize(body.manager_employee_id)
      : null,
    valid_from: body.valid_from || today(),
    valid_to: body.valid_to || "9999-12-31",
  };

  await DataBase.insert("employees", row);
  return { message: "Employee created", employee_number };
}

/* ---------------- GET handler ---------------- */
async function getEmployee(query) {
  const { employee_number } = query;
  if (!employee_number) {
    throw new Error("Missing query parameter: employee_number");
  }

  const result = await DataBase.query(
    `SELECT * FROM employees WHERE employee_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(employee_number)]
  );

  if (!result || result.length === 0) {
    return null;
  }

  const raw = result[0];
  const cleaned = {};
  for (const key in raw) {
    cleaned[key] = sanitize(raw[key]);
  }

  return cleaned;
}

/* ---------------- PUT handler ---------------- */
async function putEmployee(data) {
  const { employee_number } = data;
  if (!employee_number)
    throw new Error("Missing field: employee_number");

  const existing = await DataBase.query(
    `SELECT * FROM employees WHERE employee_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(employee_number)]
  );
  if (!existing.length)
    throw new Error(`Employee '${employee_number}' not found`);

  const required = [
    "user_name",
    "department",
    "date_of_joining",
    "designation",
  ];
  const missing = checkMissingFields(data, required);
  if (missing.length)
    throw new Error(`Missing fields: ${missing.join(", ")}`);

  const users = await DataBase.query(
    `SELECT * FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(data.user_name)]
  );
  if (!users.length)
    throw new Error(`user_name '${data.user_name}' does not exist`);

  const clash = await DataBase.query(
    `SELECT * FROM employees WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(data.user_name)]
  );
  if (
    clash.length &&
    clash[0].employee_number !== employee_number
  ) {
    throw new Error(
      `user_name '${data.user_name}' is already linked to employee_number '${clash[0].employee_number}'`
    );
  }

  if (data.manager_employee_id) {
    const mgr = await DataBase.query(
      `SELECT * FROM employees WHERE employee_number = $1 AND valid_to >= CURRENT_DATE`,
      [sanitize(data.manager_employee_id)]
    );
    if (!mgr.length)
      throw new Error(
        `manager_employee_id '${data.manager_employee_id}' not found`
      );
  }

  const update = {
    user_name: sanitize(data.user_name),
    department: sanitize(data.department),
    date_of_joining: data.date_of_joining,
    designation: sanitize(data.designation),
    manager_employee_id: data.manager_employee_id
      ? sanitize(data.manager_employee_id)
      : null,
    valid_from: data.valid_from || today(),
    valid_to: data.valid_to || "9999-12-31",
  };

  await DataBase.update(
    "employees",
    update,
    { employee_number: sanitize(employee_number) }
  );

  return {
    message: `Employee '${employee_number}' updated successfully`,
  };
}

/* ---------------- DELETE handler (soft delete) ---------------- */
async function deleteEmployee({employee_number}) {
  if (!employee_number) {
    throw new Error("Missing field: employee_number");
  }

 const existing = await DataBase.query(
    `SELECT * FROM employees WHERE employee_number = $1 AND valid_to >= CURRENT_DATE`,
    [sanitize(employee_number)]
  );

  if (!existing.length) {
    throw new Error(`Employee '${employee_number}' not found`);
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formatted = yesterday.toISOString().split("T")[0];

  await DataBase.update(
    "employees",
    { valid_to: formatted },
    { employee_number: sanitize(employee_number) }
  );

  return { message: `Employee '${employee_number}' soft-deleted ` };
}

module.exports = {
  postEmployee,
  getEmployee,
  putEmployee,
  deleteEmployee,
};
