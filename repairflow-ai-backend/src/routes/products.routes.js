import { Router } from "express";
import { authenticate, allowRoles } from "../middleware/authenticate.js";
import { listProducts, createProduct, updateProduct, createStockMovement } from "../controllers/products.controller.js";

const router = Router();
router.use(authenticate);
router.get("/", listProducts);
router.post("/", allowRoles("owner", "manager"), createProduct);
router.put("/:id", allowRoles("owner", "manager"), updateProduct);
router.post("/stock-movements", allowRoles("owner", "manager", "technician"), createStockMovement);
export default router;
