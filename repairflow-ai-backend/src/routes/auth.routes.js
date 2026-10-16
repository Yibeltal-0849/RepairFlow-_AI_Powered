import { Router } from "express";
import { login, register, me } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import rateLimit from "express-rate-limit";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authenticate, me);
export default router;
