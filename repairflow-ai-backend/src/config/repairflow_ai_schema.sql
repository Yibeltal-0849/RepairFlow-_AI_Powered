-- REPAIRFLOW AI database schema
-- Target: MySQL 8.0+
-- Run this file in MySQL Workbench or the MySQL command-line client.

CREATE DATABASE IF NOT EXISTS repairflow_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE repairflow_ai;

-- 1. User accounts and staff roles
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'manager', 'technician', 'front_desk') NOT NULL DEFAULT 'technician',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(40),
    email VARCHAR(254),
    telegram_chat_id VARCHAR(100),
    notification_consent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_name (full_name),
    INDEX idx_customers_phone (phone)
) ENGINE=InnoDB;

-- 3. Repair tickets
CREATE TABLE IF NOT EXISTS repairs (
    repair_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(40) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    device_brand VARCHAR(100) NOT NULL,
    device_model VARCHAR(150) NOT NULL,
    reported_issue TEXT NOT NULL,
    diagnosis_summary TEXT,
    status ENUM(
        'Received', 'Diagnosing', 'Waiting for Part', 'Waiting for Customer',
        'In Repair', 'Ready for Pickup', 'Completed', 'Cancelled'
    ) NOT NULL DEFAULT 'Received',
    estimated_cost DECIMAL(12,2),
    final_cost DECIMAL(12,2),
    promised_at DATETIME,
    assigned_to BIGINT UNSIGNED,
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_repairs_customer FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_repairs_assigned_user FOREIGN KEY (assigned_to)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_repairs_created_user FOREIGN KEY (created_by)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_repairs_status (status),
    INDEX idx_repairs_promised_at (promised_at),
    INDEX idx_repairs_assigned_to (assigned_to),
    INDEX idx_repairs_customer (customer_id),
    INDEX idx_repairs_created_at (created_at)
) ENGINE=InnoDB;

-- 4. Status history: one repair can have many status changes
CREATE TABLE IF NOT EXISTS repair_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(40),
    new_status VARCHAR(40) NOT NULL,
    changed_by BIGINT UNSIGNED,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_status_history_repair FOREIGN KEY (repair_id)
        REFERENCES repairs(repair_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_status_history_user FOREIGN KEY (changed_by)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_status_history_repair_date (repair_id, created_at)
) ENGINE=InnoDB;

-- 5. AI diagnosis sessions and staff review
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
    diagnosis_session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(80) NOT NULL DEFAULT 'Gemini',
    model_name VARCHAR(120),
    input_summary TEXT NOT NULL,
    structured_suggestions JSON,
    uncertainty_notes TEXT,
    status ENUM('pending_review', 'approved', 'rejected', 'edited', 'failed') NOT NULL DEFAULT 'pending_review',
    reviewed_by BIGINT UNSIGNED,
    reviewed_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_diagnosis_repair FOREIGN KEY (repair_id)
        REFERENCES repairs(repair_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_diagnosis_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_diagnosis_repair_date (repair_id, created_at),
    INDEX idx_diagnosis_status (status)
) ENGINE=InnoDB;

-- 6. Technician tests and measurements
CREATE TABLE IF NOT EXISTS diagnostic_tests (
    diagnostic_test_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_id BIGINT UNSIGNED NOT NULL,
    diagnosis_session_id BIGINT UNSIGNED,
    test_name VARCHAR(150) NOT NULL,
    measurement VARCHAR(150),
    result TEXT,
    technician_id BIGINT UNSIGNED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tests_repair FOREIGN KEY (repair_id)
        REFERENCES repairs(repair_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_tests_diagnosis FOREIGN KEY (diagnosis_session_id)
        REFERENCES diagnosis_sessions(diagnosis_session_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_tests_technician FOREIGN KEY (technician_id)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_tests_repair_date (repair_id, created_at)
) ENGINE=InnoDB;

-- 7. Spare parts / products
CREATE TABLE IF NOT EXISTS products (
    product_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    category VARCHAR(100),
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_products_quantity CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_products_reorder CHECK (reorder_level >= 0),
    CONSTRAINT chk_products_cost CHECK (unit_cost >= 0),
    CONSTRAINT chk_products_price CHECK (selling_price >= 0),
    INDEX idx_products_name (name),
    INDEX idx_products_category (category)
) ENGINE=InnoDB;

-- 8. Every stock addition, usage, or correction is recorded here.
-- quantity_delta is positive for stock received and negative for stock used.
CREATE TABLE IF NOT EXISTS stock_movements (
    stock_movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    repair_id BIGINT UNSIGNED,
    movement_type ENUM('received', 'used', 'adjustment', 'returned') NOT NULL,
    quantity_delta INT NOT NULL,
    unit_cost DECIMAL(12,2),
    reason VARCHAR(255),
    created_by BIGINT UNSIGNED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_product FOREIGN KEY (product_id)
        REFERENCES products(product_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_stock_repair FOREIGN KEY (repair_id)
        REFERENCES repairs(repair_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_stock_user FOREIGN KEY (created_by)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_stock_product_date (product_id, created_at),
    INDEX idx_stock_repair (repair_id)
) ENGINE=InnoDB;

-- 9. Actionable tasks for overdue or blocked repairs
CREATE TABLE IF NOT EXISTS workflow_tasks (
    workflow_task_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_id BIGINT UNSIGNED,
    task_type VARCHAR(80) NOT NULL,
    reason TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    assigned_to BIGINT UNSIGNED,
    due_at DATETIME,
    status ENUM('open', 'in_progress', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    deduplication_key VARCHAR(190) UNIQUE,
    resolved_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_repair FOREIGN KEY (repair_id)
        REFERENCES repairs(repair_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_tasks_status_due (status, due_at),
    INDEX idx_tasks_repair (repair_id)
) ENGINE=InnoDB;

-- 10. Audit trail for important user/system actions
CREATE TABLE IF NOT EXISTS audit_events (
    audit_event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id BIGINT UNSIGNED,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED,
    action VARCHAR(100) NOT NULL,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id)
        REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB;

-- 11. Customer notification attempts and outcomes
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repair_id BIGINT UNSIGNED,
    channel ENUM('telegram', 'email', 'sms', 'other') NOT NULL,
    recipient VARCHAR(254) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 0,
    sent_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_repair FOREIGN KEY (repair_id)
        REFERENCES repairs(repair_id) ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_repair (repair_id)
) ENGINE=InnoDB;

-- 12. Integration sync logs for Telegram / Google Sheets and other adapters
CREATE TABLE IF NOT EXISTS integration_sync_logs (
    integration_sync_log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    integration_name ENUM('telegram', 'google_sheets', 'other') NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80),
    entity_id BIGINT UNSIGNED,
    status ENUM('pending', 'success', 'failed', 'retrying') NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at DATETIME,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_integration_status_retry (status, next_retry_at),
    INDEX idx_integration_entity (entity_type, entity_id)
) ENGINE=InnoDB;
