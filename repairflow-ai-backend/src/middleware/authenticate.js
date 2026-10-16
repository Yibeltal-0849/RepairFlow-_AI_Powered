import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ success: false, message: "Bearer token required." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const rows = await query(
      "SELECT user_id, full_name, email, role, is_active FROM users WHERE user_id = ? LIMIT 1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: "Account is unavailable." });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
    next(error);
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
    }
    next();
  };
}
