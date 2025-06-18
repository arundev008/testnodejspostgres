// const express = require("express");
// const router = express.Router();
// const userController = require("../srv/master/user");
// const employeeCtrl = require("../srv/master/employee");
// const employeePosCtrl = require("../srv/transaction/employeePosition");
// const contractorCtrl  = require("../srv/master/contractor");


// // GET user by user_name
// router.get("/user", async (req, res) => {
//   try {
//     const result = await userController.getUser(req.query);
//     if (!result) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /user (GET):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // POST user (Create or Update user with address)
// router.post("/user", async (req, res) => {
//   try {
//     const result = await userController.postUser(req.body);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /user (POST):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // PUT user (Strictly update master_users only)
// router.put("/user", async (req, res) => {
//   try {
//     const result = await userController.updateUser(req.body);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /user (PUT):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // PATCH user
// router.patch("/user", async (req, res) => {
//   try {
//     const result = await userController.patchUser(req.body);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /user (PATCH):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // DELETE user by user_name
// router.delete("/user", async (req, res) => {
//   try {
//     const result = await userController.deleteUser(req.query.user_name);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /user (DELETE):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// /* POST /employee → create new employee */
// router.post("/employee", async (req, res) => {
//   try {
//     const result = await employeeCtrl.createEmployee(req.body);
//     res.status(201).json(result);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// // GET employee Details
// router.get("/employee", async (req, res) => {
//   try {
//     const result = await employeeCtrl.getEmployee(req.query);
//     if (!result) {
//       return res.status(404).json({ message: "Employee not found" });
//     }
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /employee (GET):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // PUT Employee
// router.put("/employee", async (req, res) => {
//   try {
//     const result = await employeeCtrl.updateEmployee(req.body);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /employee (PUT):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // DELETE employee
// router.delete("/employee", async (req, res) => {
//   try {
//     const result = await employeeCtrl.deleteEmployee(req.query.employee_number);
//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error in /employee (DELETE):", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// /* POST /employee_position */
// router.post("/employee_position", async (req, res) => {
//   try {
//     const result = await employeePosCtrl.createEmployeePosition(req.body);
//     res.status(201).json(result);
//   } catch (err) {
//     console.error("Error in /employee_position (POST):", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// // GET employee_position
// router.get("/employee_position", async (req, res) => {
//   try {
//     const result = await employeePosCtrl.getEmployeePosition(req.query);
//     if (!result) {
//       return res.status(404).json({ message: "Employee position not found" });
//     }
//     res.json(result);
//   } catch (err) {
//     console.error("Error in /employee_position (GET):", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// // PUT employee_position
// router.put("/employee_position", async (req, res) => {
//   try {
//     const result = await employeePosCtrl.updateEmployeePosition(req.body);
//     res.json(result);
//   } catch (err) {
//     console.error("Error in PUT /employee_position:", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// /* --------------------------------------------------------
//    CONTRACTOR USERS
// -------------------------------------------------------- */
// router.post("/contractor", async (req, res) => {
//   try {
//     const out = await contractorCtrl.postContractor(req.body);
//     res.status(201).json(out);
//   } catch (err) {
//     console.error("Error POST /contractor:", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// router.get("/contractor", async (req, res) => {
//   try {
//     const out = await contractorCtrl.getContractor(req.query);
//     if (!out) return res.status(404).json({ message: "Contractor not found" });
//     res.json(out);
//   } catch (err) {
//     console.error("Error GET /contractor:", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// router.put("/contractor", async (req, res) => {
//   try {
//     const out = await contractorCtrl.updateContractor(req.body);
//     res.json(out);
//   } catch (err) {
//     console.error("Error PUT /contractor:", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// router.delete("/contractor", async (req, res) => {
//   try {
//     const out = await contractorCtrl.deleteContractor(req.query);
//     res.json(out);
//   } catch (err) {
//     console.error("Error DELETE /contractor:", err.message);
//     res.status(400).json({ error: err.message });
//   }
// });

// module.exports = router;
