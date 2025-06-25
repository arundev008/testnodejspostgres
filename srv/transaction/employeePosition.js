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
  if (!emp.length || new Date(emp[0].valid_to) <= new Date()) {
    throw new Error(`employee_number '${body.employee_number}' is not active or does not exist`);
  }

  const user = await DataBase.read("master_users", {
    user_name: sanitize(body.approved_by),
  });
  if (!user.length) {
    throw new Error(`approved_by '${body.approved_by}' not found in master_users`);
  }

  const activePositions = await DataBase.read("employee_positions", {
    employee_number: sanitize(body.employee_number),
  });

  const todayDate = new Date();
  const yesterday = new Date(todayDate);
  yesterday.setDate(todayDate.getDate() - 1);
  const formattedYesterday = yesterday.toISOString().split("T")[0];

  for (const pos of activePositions) {
    if (new Date(pos.valid_to) > todayDate) {
      
      await DataBase.update(
        "employee_positions",
        { valid_to: formattedYesterday },
        {
          employee_number: sanitize(body.employee_number),
          valid_from: pos.valid_from,  
        }
      );
    }
  }
  const row = {
    employee_number: sanitize(body.employee_number),
    designation: sanitize(body.designation),
    valid_from: body.valid_from || todayDate.toISOString().split("T")[0],
    valid_to: body.valid_to || "9999-12-31",
    approved_by: sanitize(body.approved_by),
    approved_on: body.approved_on || todayDate.toISOString().split("T")[0],
    department: sanitize(body.department),
  };

  await DataBase.insert("employee_positions", row);

  return { message: "Employee position created", data: row };
}


/* ---------------- GET: fetch employee_position by employee_number -------------- */
async function getEmployeePosition(query) {
  const { employee_number } = query;
  if (!employee_number) throw new Error("Missing query parameter: employee_number");

  const emp = await DataBase.read("employees", {
    employee_number: sanitize(employee_number),
  });

  if (!emp.length || new Date(emp[0].valid_to) <= new Date()) {
    throw new Error(`employee_number '${employee_number}' is not active`);
  }

  const result = await DataBase.read("employee_positions", {
    employee_number: sanitize(employee_number),
  });

  if (!result || result.length === 0) return null;

  return result.map(row => {
    const cleaned = {};
    for (const key in row) {
      cleaned[key] = sanitize(row[key]);
    }
    return cleaned;
  });
}

/* ---------------- PUT: update employee_position row -------------- */
async function putEmployeePosition(data) {
  const { employee_number } = data;
  if (!employee_number) {
    throw new Error("Missing field: employee_number");
  }

  const rows = await DataBase.query(
    `SELECT * FROM employee_positions 
     WHERE employee_number = $1 AND valid_to = '9999-12-31' 
     ORDER BY valid_from DESC LIMIT 1`,
    [sanitize(employee_number)]
  );

  if (!rows.length) {
    throw new Error(`No active employee_position found for '${employee_number}'`);
  }

  const target = rows[0];

  if (!data.approved_by) {
    throw new Error("Missing field: approved_by");
  }

  const user = await DataBase.read("master_users", {
    user_name: sanitize(data.approved_by),
  });
  if (!user.length) {
    throw new Error(`approved_by '${data.approved_by}' not found`);
  }

  const required = [
    "designation",
    "department",
    "approved_by",
    "approved_on",
  ];
  const missing = checkMissingFields(data, required);
  if (missing.length) {
    throw new Error(`Missing fields: ${missing.join(", ")}`);
  }

  const updatePayload = {
    designation: sanitize(data.designation),
    department: sanitize(data.department),
    approved_by: sanitize(data.approved_by),
    approved_on: data.approved_on,
    valid_from: data.valid_from || target.valid_from,
    valid_to: data.valid_to || target.valid_to,
  };

  await DataBase.update(
    "employee_positions",
    updatePayload,
    {
      employee_number: sanitize(employee_number),
      valid_to: "9999-12-31",
    }
  );

  return {
    message: `employee_position for '${employee_number}' updated successfully`,
  };
}

module.exports = {
  postEmployeePosition,
  getEmployeePosition,
  putEmployeePosition,
};
