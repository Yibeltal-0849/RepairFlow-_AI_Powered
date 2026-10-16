import { useEffect, useState } from "react";
import api from "../../services/api";
import "./Product.css";

function Product() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productForm, setProductForm] = useState({
    sku: "",
    name: "",
    category: "",
    quantity_on_hand: 0,
    reorder_level: 0,
    unit_cost: 0,
    selling_price: 0
  });

  const [stockForm, setStockForm] = useState({
    movement_type: "received",
    quantity: 1,
    unit_cost: "",
    reason: ""
  });

  /* =====================================================
     LOAD PRODUCTS
  ===================================================== */

  async function fetchProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products", {
        params: {
          search: search.trim()
        }
      });

      setProducts(response.data?.data || []);
    } catch (err) {
      console.error("Load products error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  /* =====================================================
     PRODUCT FORM
  ===================================================== */

  function handleProductChange(event) {
    const { name, value } = event.target;

    setProductForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function resetProductForm() {
    setProductForm({
      sku: "",
      name: "",
      category: "",
      quantity_on_hand: 0,
      reorder_level: 0,
      unit_cost: 0,
      selling_price: 0
    });

    setEditingProduct(null);
  }

  function openAddProduct() {
    resetProductForm();
    setError("");
    setSuccess("");
    setShowProductModal(true);
  }

  function openEditProduct(product) {
    setEditingProduct(product);

    setProductForm({
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      quantity_on_hand: product.quantity_on_hand ?? 0,
      reorder_level: product.reorder_level ?? 0,
      unit_cost: product.unit_cost ?? 0,
      selling_price: product.selling_price ?? 0
    });

    setError("");
    setSuccess("");
    setShowProductModal(true);
  }

  function closeProductModal() {
    if (saving) return;

    setShowProductModal(false);
    resetProductForm();
    setError("");
  }

  /* =====================================================
     CREATE / UPDATE PRODUCT
  ===================================================== */

  async function handleProductSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const sku = productForm.sku.trim();
    const name = productForm.name.trim();

    if (!sku) {
      setError("SKU is required.");
      return;
    }

    if (!name) {
      setError("Product name is required.");
      return;
    }

    const numericValues = [
      productForm.quantity_on_hand,
      productForm.reorder_level,
      productForm.unit_cost,
      productForm.selling_price
    ];

    if (
      numericValues.some(
        (value) =>
          !Number.isFinite(Number(value)) ||
          Number(value) < 0
      )
    ) {
      setError(
        "Quantities and prices must be non-negative numbers."
      );
      return;
    }

    try {
      setSaving(true);

      if (editingProduct) {
        /*
         * Backend updateProduct does NOT allow quantity_on_hand.
         * Stock must be changed through stock-movements.
         */
        const payload = {
          sku,
          name,
          category:
            productForm.category.trim() || null,
          reorder_level: Number(
            productForm.reorder_level
          ),
          unit_cost: Number(productForm.unit_cost),
          selling_price: Number(
            productForm.selling_price
          )
        };

        await api.put(
          `/products/${editingProduct.product_id}`,
          payload
        );

        setSuccess("Product updated successfully.");
      } else {
        const payload = {
          sku,
          name,
          category:
            productForm.category.trim() || null,
          quantity_on_hand: Number(
            productForm.quantity_on_hand
          ),
          reorder_level: Number(
            productForm.reorder_level
          ),
          unit_cost: Number(productForm.unit_cost),
          selling_price: Number(
            productForm.selling_price
          )
        };

        await api.post("/products", payload);

        setSuccess("Product created successfully.");
      }

      setShowProductModal(false);
      resetProductForm();

      await fetchProducts();
    } catch (err) {
      console.error("Save product error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     STOCK MOVEMENT
  ===================================================== */

  function openStockModal(product) {
    setSelectedProduct(product);

    setStockForm({
      movement_type: "received",
      quantity: 1,
      unit_cost: product.unit_cost ?? "",
      reason: ""
    });

    setError("");
    setSuccess("");
    setShowStockModal(true);
  }

  function closeStockModal() {
    if (saving) return;

    setShowStockModal(false);
    setSelectedProduct(null);
    setError("");
  }

  function handleStockChange(event) {
    const { name, value } = event.target;

    setStockForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleStockSubmit(event) {
    event.preventDefault();

    if (!selectedProduct) return;

    setError("");
    setSuccess("");

    const quantity = Number(stockForm.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Quantity must be a positive whole number."
      );
      return;
    }

    if (
      stockForm.unit_cost !== "" &&
      (!Number.isFinite(
        Number(stockForm.unit_cost)
      ) ||
        Number(stockForm.unit_cost) < 0)
    ) {
      setError("Unit cost must be a non-negative number.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        product_id: selectedProduct.product_id,
        movement_type: stockForm.movement_type,
        quantity,
        unit_cost:
          stockForm.unit_cost === ""
            ? null
            : Number(stockForm.unit_cost),
        reason:
          stockForm.reason.trim() || null
      };

      const response = await api.post(
        "/products/stock-movements",
        payload
      );

      setSuccess(
        response.data?.message ||
          "Stock movement recorded successfully."
      );

      setShowStockModal(false);
      setSelectedProduct(null);

      await fetchProducts();
    } catch (err) {
      console.error("Stock movement error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to record stock movement."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     HELPERS
  ===================================================== */

  function getStockStatus(product) {
    const quantity = Number(
      product.quantity_on_hand || 0
    );

    const reorderLevel = Number(
      product.reorder_level || 0
    );

    if (quantity <= 0) {
      return {
        label: "Out of Stock",
        className: "status-danger"
      };
    }

    if (quantity <= reorderLevel) {
      return {
        label: "Low Stock",
        className: "status-warning"
      };
    }

    return {
      label: "In Stock",
      className: "status-success"
    };
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="product-page">

      {/* PAGE HEADER */}
      <div className="product-header">
        <div>
          <h1>Products</h1>

          <p>
            Manage products, stock levels and
            inventory movements.
          </p>
        </div>

        <button
          type="button"
          className="product-btn product-btn-primary"
          onClick={openAddProduct}
        >
          + Add Product
        </button>
      </div>

      {/* ALERTS */}
      {error &&
        !showProductModal &&
        !showStockModal && (
          <div className="product-alert product-alert-error">
            {error}
          </div>
        )}

      {success &&
        !showProductModal &&
        !showStockModal && (
          <div className="product-alert product-alert-success">
            {success}
          </div>
        )}

      {/* SEARCH TOOLBAR */}
      <div className="product-toolbar">
        <div className="product-search">
          <span className="product-search-icon">
            ⌕
          </span>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search products, SKU or category..."
          />

          {search && (
            <button
              type="button"
              className="product-search-clear"
              onClick={() => setSearch("")}
            >
              ×
            </button>
          )}
        </div>

        <span className="product-count">
          {products.length} product
          {products.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* PRODUCT TABLE */}
      <div className="product-card">

        {loading ? (
          <div className="product-state">
            <div className="product-spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="product-state">
            <div className="product-empty-icon">
              📦
            </div>

            <h3>No products found</h3>

            <p>
              {search
                ? "Try a different search."
                : "Add your first product to get started."}
            </p>

            {!search && (
              <button
                type="button"
                className="product-btn product-btn-primary"
                onClick={openAddProduct}
              >
                + Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="product-table-wrapper">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Unit Cost</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const status =
                    getStockStatus(product);

                  return (
                    <tr key={product.product_id}>

                      {/* PRODUCT */}
                      <td>
                        <div className="product-info">
                          <div className="product-icon">
                            📦
                          </div>

                          <div>
                            <strong>
                              {product.name}
                            </strong>

                            <small>
                              SKU: {product.sku}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td>
                        {product.category || "-"}
                      </td>

                      {/* STOCK */}
                      <td>
                        <strong>
                          {product.quantity_on_hand}
                        </strong>
                      </td>

                      {/* REORDER */}
                      <td>
                        {product.reorder_level}
                      </td>

                      {/* UNIT COST */}
                      <td>
                        {formatMoney(
                          product.unit_cost
                        )}
                      </td>

                      {/* SELLING PRICE */}
                      <td>
                        {formatMoney(
                          product.selling_price
                        )}
                      </td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`product-status ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="product-edit-btn"
                            onClick={() =>
                              openEditProduct(product)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="product-stock-btn"
                            onClick={() =>
                              openStockModal(product)
                            }
                          >
                            Stock
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          ADD / EDIT PRODUCT MODAL
      ================================================= */}

      {showProductModal && (
        <div
          className="product-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeProductModal();
            }
          }}
        >
          <div className="product-modal">

            <div className="product-modal-header">
              <div>
                <h2>
                  {editingProduct
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p>
                  {editingProduct
                    ? "Update product information."
                    : "Add a new product to your system."}
                </p>
              </div>

              <button
                type="button"
                className="product-modal-close"
                onClick={closeProductModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProductSubmit}>

              {error && (
                <div className="product-alert product-alert-error product-modal-alert">
                  {error}
                </div>
              )}

              <div className="product-form">

                {/* SKU */}
                <div className="product-form-group">
                  <label>
                    SKU <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="sku"
                    value={productForm.sku}
                    onChange={handleProductChange}
                    placeholder="e.g. SAM-S23-SCR"
                    disabled={saving}
                  />
                </div>

                {/* NAME */}
                <div className="product-form-group">
                  <label>
                    Product Name <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleProductChange}
                    placeholder="e.g. Samsung S23 Screen"
                    disabled={saving}
                  />
                </div>

                {/* CATEGORY */}
                <div className="product-form-group product-form-full">
                  <label>
                    Category
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={productForm.category}
                    onChange={handleProductChange}
                    placeholder="e.g. Screens, Batteries, Chargers"
                    disabled={saving}
                  />
                </div>

                {/* INITIAL STOCK */}
                {!editingProduct && (
                  <div className="product-form-group">
                    <label>
                      Initial Quantity
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="quantity_on_hand"
                      value={
                        productForm.quantity_on_hand
                      }
                      onChange={handleProductChange}
                      disabled={saving}
                    />
                  </div>
                )}

                {/* REORDER LEVEL */}
                <div className="product-form-group">
                  <label>
                    Reorder Level
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="reorder_level"
                    value={
                      productForm.reorder_level
                    }
                    onChange={handleProductChange}
                    disabled={saving}
                  />
                </div>

                {/* UNIT COST */}
                <div className="product-form-group">
                  <label>
                    Unit Cost
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="unit_cost"
                    value={productForm.unit_cost}
                    onChange={handleProductChange}
                    disabled={saving}
                  />
                </div>

                {/* SELLING PRICE */}
                <div className="product-form-group">
                  <label>
                    Selling Price
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="selling_price"
                    value={
                      productForm.selling_price
                    }
                    onChange={handleProductChange}
                    disabled={saving}
                  />
                </div>

              </div>

              <div className="product-modal-footer">
                <button
                  type="button"
                  className="product-btn product-btn-secondary"
                  onClick={closeProductModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-btn product-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Create Product"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =================================================
          STOCK MOVEMENT MODAL
      ================================================= */}

      {showStockModal && selectedProduct && (
        <div
          className="product-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeStockModal();
            }
          }}
        >
          <div className="product-modal product-stock-modal">

            <div className="product-modal-header">
              <div>
                <h2>Stock Movement</h2>

                <p>
                  {selectedProduct.name}
                </p>
              </div>

              <button
                type="button"
                className="product-modal-close"
                onClick={closeStockModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleStockSubmit}>

              {error && (
                <div className="product-alert product-alert-error product-modal-alert">
                  {error}
                </div>
              )}

              {/* CURRENT STOCK */}
              <div className="current-stock">
                <div>
                  <span>Current Stock</span>
                  <strong>
                    {selectedProduct.quantity_on_hand}
                  </strong>
                </div>

                <div>
                  <span>Reorder Level</span>
                  <strong>
                    {selectedProduct.reorder_level}
                  </strong>
                </div>
              </div>

              <div className="product-form">

                {/* MOVEMENT TYPE */}
                <div className="product-form-group product-form-full">
                  <label>
                    Movement Type
                  </label>

                  <select
                    name="movement_type"
                    value={
                      stockForm.movement_type
                    }
                    onChange={handleStockChange}
                    disabled={saving}
                  >
                    <option value="received">
                      Received
                    </option>

                    <option value="used">
                      Used
                    </option>

                    <option value="adjustment">
                      Adjustment
                    </option>

                    <option value="returned">
                      Returned
                    </option>
                  </select>
                </div>

                {/* QUANTITY */}
                <div className="product-form-group">
                  <label>
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    name="quantity"
                    value={stockForm.quantity}
                    onChange={handleStockChange}
                    disabled={saving}
                  />
                </div>

                {/* UNIT COST */}
                <div className="product-form-group">
                  <label>
                    Unit Cost
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="unit_cost"
                    value={stockForm.unit_cost}
                    onChange={handleStockChange}
                    disabled={saving}
                  />
                </div>

                {/* REASON */}
                <div className="product-form-group product-form-full">
                  <label>
                    Reason
                  </label>

                  <textarea
                    name="reason"
                    value={stockForm.reason}
                    onChange={handleStockChange}
                    placeholder="Reason for this stock movement..."
                    rows="3"
                    disabled={saving}
                  />
                </div>

              </div>

              <div className="product-modal-footer">
                <button
                  type="button"
                  className="product-btn product-btn-secondary"
                  onClick={closeStockModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-btn product-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Record Movement"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Product;