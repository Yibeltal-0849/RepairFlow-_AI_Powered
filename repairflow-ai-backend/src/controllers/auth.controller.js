import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { audit } from "../utils/audit.js";

function createToken(user) {
  return jwt.sign({ sub: String(user.user_id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

export async function register(req, res, next) {
  try {
    const { full_name, email, password } = req.body || {};

    // Validate full name, email, and password.
    if (
      typeof full_name !== "string" ||
      full_name.trim().length < 2 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 10
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a name, valid email, and password with at least 10 characters."
      });
    }

    // Hash the password before saving it to the database.
    const password_hash = await bcrypt.hash(password, 12);

    // Public registration cannot choose a role or account status.
    const result = await query(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'Manager')",
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        password_hash
      ]
    );

    // Record the new user in the audit log.
    await audit(
      result.insertId,
      "user",
      result.insertId,
      "user.registered"
    );

    return res.status(201).json({
      success: true,
      message:
        "Account created. Ask an administrator if you need a different role."
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    const rows = await query(
      "SELECT user_id, full_name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid || !user.is_active) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const token = createToken(user);
    res.json({
      success: true,
      data: {
        token,
        user: { user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role }
      }
    });
  } catch (error) { next(error); }
}

export async function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}
