const DataBase = require("../../db/postgressql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// SET PASSWORD  -----------------
module.exports.setPassword = async (req, res) => {
  try {
    const { userName, password, confirmPassword } = req.body;
    console.log(" setPassword request:", req.body);

    if (!userName || !password || !confirmPassword) {
      console.log(" Missing userName or password or confirmPassword");
      return res.status(400).send({ error: "userName, password and confirmPassword  are required" });
    }

    if(password !== confirmPassword){
      console.log("password mismatch");
      return res.status(400).send({ error :"password do not match"});
    }

    const oldPw = await DataBase.read("user_passwords", {
      user_name: userName,
    });
    console.log(" Existing passwords:", oldPw);

    const last3 = oldPw
      .sort((a, b) => b.password_index - a.password_index)
      .slice(0, 3);

    for (const row of last3) {
      const match = await bcrypt.compare(password, row.hash.trim());
      if (match) {
        console.log(" Password matches last 3 passwords");
        return res
          .status(400)
          .send("New password matches one of the last 3 passwords.");
      }
    }

    const hash = await bcrypt.hash(password, 10);
    console.log(" New hashed password:", hash);

    const nextIndex =
      oldPw.length === 0
        ? 1
        : Math.max(...oldPw.map((p) => p.password_index)) + 1;

    const insertData = {
      user_name: userName,
      password_index: nextIndex,
      hash,
      valid_from: new Date().toISOString().split("T")[0],
      valid_to: "9999-12-31",
    };

    console.log(" Inserting into DB:", insertData);
    await DataBase.insert("user_passwords", insertData);

    //  Only now update old password's valid_to
    if (oldPw.length) {
      const latest = oldPw.sort(
        (a, b) => b.password_index - a.password_index
      )[0];
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterday = y.toISOString().split("T")[0];

      console.log(
        ` Updating old password_index ${latest.password_index} valid_to → ${yesterday}`
      );
      await DataBase.update(
        "user_passwords",
        { valid_to: yesterday },
        { user_name: userName, password_index: latest.password_index }
      );
    }

    console.log(" Password successfully set");
    res.status(200).send("Password successfully changed.");
  } catch (err) {
    console.error(" setPassword error:", err);
    res.status(500).send({ error: err.message });
  }
};

// CHECK PASSWORD (LOGIN) -----------------------
module.exports.checkPassword = async (req, res) => {
  try {
    const { userName, password } = req.body;
    console.log(" checkPassword request:", req.body);

    if (!userName || !password) {
      console.log(" Missing userName or password");
      return res
        .status(400)
        .send({ error: "userName and password are required" });
    }

    const rows = await DataBase.read("user_passwords", { user_name: userName });
    console.log(" Password rows from DB:", rows);

    if (!rows.length) {
      console.log(" No password found for user");
      return res.status(404).send("Password not set for this user.");
    }

    const latest = rows.sort((a, b) => b.password_index - a.password_index)[0];
    const storedHash = latest.hash.trim();
    console.log(" Latest hash to compare:", storedHash);

    const match = await bcrypt.compare(password, storedHash);
    console.log(" Password match result:", match);

    if (!match) {
      console.log(" Incorrect password");
      return res.status(403).send("Incorrect password");
    }

    // Check if user is still active in master_users
    const userActive = await DataBase.query(
      `SELECT 1 FROM master_users WHERE user_name = $1 AND valid_to >= CURRENT_DATE`,
      [userName]
    );

    if (!userActive.length) {
      console.log("User is soft-deleted in master_users");
      return res.status(403).send("User is blocked or deleted.");
    }

    const token = jwt.sign(
      { userId: userName, username: userName },
      "SmodTiterp@2024",
      { expiresIn: "24h" }
    );
    console.log(" Login success, token generated");

    res.status(200).send({ token });
  } catch (err) {
    console.error(" checkPassword error:", err);
    res.status(500).send({ error: err.message });
  }
};
