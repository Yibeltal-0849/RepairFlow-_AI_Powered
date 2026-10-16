import { query, withTransaction } from "../config/db.js";
import { audit } from "../utils/audit.js";

export async function listProducts(req, res, next) {
  try {
    const term = `%${String(req.query.search || "").trim()}%`;
    const rows = await query(
      `SELECT product_id, sku, name, category, quantity_on_hand, reorder_level, unit_cost, selling_price, created_at, updated_at
       FROM products WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? ORDER BY name LIMIT 200`,
      [term, term, term]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

export async function createProduct(req, res, next) {
  try {
    const { sku, name, category = null, quantity_on_hand = 0, reorder_level = 0, unit_cost = 0, selling_price = 0 } = req.body || {};
    if (typeof sku !== "string" || !sku.trim() || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "sku and name are required." });
    }
    const values = [quantity_on_hand, reorder_level, unit_cost, selling_price];
    if (values.some(v => !Number.isFinite(Number(v)) || Number(v) < 0)) {
      return res.status(400).json({ success: false, message: "Quantities and prices must be non-negative numbers." });
    }
    const result = await query(
      "INSERT INTO products (sku, name, category, quantity_on_hand, reorder_level, unit_cost, selling_price) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [sku.trim(), name.trim(), category, Number(quantity_on_hand), Number(reorder_level), Number(unit_cost), Number(selling_price)]
    );
    await audit(req.user.user_id, "product", result.insertId, "product.created");
    res.status(201).json({ success: true, data: { product_id: result.insertId } });
  } catch (e) { next(e); }
}

export async function updateProduct(req, res, next) {
  try {
    const { sku, name, category = null, reorder_level = 0, unit_cost = 0, selling_price = 0 } = req.body || {};
    if (typeof sku !== "string" || !sku.trim() || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "sku and name are required." });
    }
    if ([reorder_level, unit_cost, selling_price].some(v => !Number.isFinite(Number(v)) || Number(v) < 0)) {
      return res.status(400).json({ success: false, message: "Reorder level and prices must be non-negative numbers." });
    }
    const result = await query(
      "UPDATE products SET sku=?, name=?, category=?, reorder_level=?, unit_cost=?, selling_price=? WHERE product_id=?",
      [sku.trim(), name.trim(), category, Number(reorder_level), Number(unit_cost), Number(selling_price), req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Product not found." });
    await audit(req.user.user_id, "product", req.params.id, "product.updated");
    res.json({ success: true, message: "Product updated. Use stock-movements to change quantity." });
  } catch (e) { next(e); }
}

export async function createStockMovement(req, res, next) {
  try {
    const { product_id, repair_id = null, movement_type, quantity, unit_cost = null, reason = null } = req.body || {};
    const allowed = ["received", "used", "adjustment", "returned"];
    if (!product_id || !allowed.includes(movement_type) || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: "Provide product_id, a valid movement_type, and a positive integer quantity." });
    }
    const delta = movement_type === "used" ? -Number(quantity) : Number(quantity);
    const output = await withTransaction(async (conn) => {
      const [rows] = await conn.execute("SELECT quantity_on_hand FROM products WHERE product_id=? FOR UPDATE", [product_id]);
      if (!rows[0]) { const err = new Error("Product not found."); err.statusCode = 404; throw err; }
      const newQuantity = rows[0].quantity_on_hand + delta;
      if (newQuantity < 0) { const err = new Error("Not enough stock for this movement."); err.statusCode = 409; throw err; }
      await conn.execute("UPDATE products SET quantity_on_hand=? WHERE product_id=?", [newQuantity, product_id]);
      const [movement] = await conn.execute(
        `INSERT INTO stock_movements (product_id, repair_id, movement_type, quantity_delta, unit_cost, reason, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product_id, repair_id, movement_type, delta, unit_cost, reason, req.user.user_id]
      );
      await conn.execute(
        "INSERT INTO audit_events (actor_id, entity_type, entity_id, action, metadata) VALUES (?, 'product', ?, 'stock.movement_recorded', ?)",
        [req.user.user_id, product_id, JSON.stringify({ movement_type, quantity_delta: delta, repair_id })]
      );
      return { stock_movement_id: movement.insertId, product_id: Number(product_id), quantity_on_hand: newQuantity, quantity_delta: delta };
    });
    res.status(201).json({ success: true, data: output });
  } catch (e) { next(e); }
}
