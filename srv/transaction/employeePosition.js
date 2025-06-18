const DataBase = require("../../db/postgressql");
const { sanitize, today, checkMissingFields } = require("../common/utils");

/* ---------------- POST: create employee_positions row -------------- */
async function postEmployeePosition(body) {
  const req = ["employee_number", "designation", "department", "approved_by"];
  const miss = checkMissingFields(body, req);
  if (miss.length) throw new Error(`Missing fields: ${miss.join(", ")}`);

  const emp = await DataBase.read("employees", {
    employee_number: sanitize(body.employee_number),
  });
  if (!emp.length)
    throw new Error(`employee_number '${body.employee_number}' not found in employees`);

  const user = await DataBase.read("master_users", {
    user_name: sanitize(body.approved_by),
  });
  if (!user.length)
    throw new Error(`approved_by '${body.approved_by}' not found in master_users`);

  const row = {
    employee_number: sanitize(body.employee_number),
    designation: sanitize(body.designation),
    valid_from: body.valid_from || today(),
    valid_to: body.valid_to || "9999-12-31",
    approved_by: sanitize(body.approved_by),
    approved_on: body.approved_on || today(),
    department: sanitize(body.department),
  };

  await DataBase.insert("employee_positions", row);

  return { message: "Employee position created", data: row };
}

/* ---------------- GET: fetch employee_position by employee_number -------------- */
async function getEmployeePosition(query) {
  const { employee_number } = query;

  if (!employee_number) {
    throw new Error("Missing query parameter: employee_number");
  }

  const result = await DataBase.read("employee_positions", {
    employee_number: sanitize(employee_number),
  });

  if (!result || result.length === 0) {
    return null;
  }

  return result[0]; // Modify here to return all rows if needed
}

/* ---------------- PUT: update employee_position row -------------- */
async function putEmployeePosition(data) {
  const { employee_number } = data;
  if (!employee_number) {
    throw new Error("Missing field: employee_number");
  }

  const emp = await DataBase.read("employees", {
    employee_number: sanitize(employee_number),
  });
  if (!emp.length) {
    throw new Error(`employee_number '${employee_number}' does not exist`);
  }

  if (!data.approved_by) {
    throw new Error("Missing field: approved_by");
  }

  const user = await DataBase.read("master_users", {
    user_name: sanitize(data.approved_by),
  });
  if (!user.length) {
    throw new Error(`approved_by '${data.approved_by}' not found`);
  }

  const req = [
    "designation",
    "valid_from",
    "valid_to",
    "department",
    "approved_by",
    "approved_on",
  ];
  const miss = checkMissingFields(data, req);
  if (miss.length) {
    throw new Error(`Missing fields: ${miss.join(", ")}`);
  }

  const updatePayload = {
    designation: sanitize(data.designation),
    valid_from: data.valid_from,
    valid_to: data.valid_to,
    department: sanitize(data.department),
    approved_by: sanitize(data.approved_by),
    approved_on: data.approved_on,
  };

  await DataBase.update(
    "employee_positions",
    updatePayload,
    { employee_number: sanitize(employee_number) }
  );

  return {
    message: `employee_positions record for '${employee_number}' updated successfully`
  };
}

module.exports = {
  postEmployeePosition,
  getEmployeePosition,
  putEmployeePosition,
};
