-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 02, 2026 at 08:02 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `repairflow_ai`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_events`
--

CREATE TABLE `audit_events` (
  `audit_event_id` bigint(20) UNSIGNED NOT NULL,
  `actor_id` bigint(20) UNSIGNED DEFAULT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_events`
--

INSERT INTO `audit_events` (`audit_event_id`, `actor_id`, `entity_type`, `entity_id`, `action`, `metadata`, `created_at`) VALUES
(67, 7, 'customer', 8, 'customer.created', NULL, '2026-11-02 04:16:53'),
(68, 7, 'repair', 11, 'repair.created', '{\"ticket_number\":\"RF-1793593172215-1415\"}', '2026-11-02 04:19:32'),
(69, NULL, 'diagnosis', 39, 'diagnosis.generated', '{\"repair_id\":11,\"provider\":\"Gemini\"}', '2026-11-02 04:21:46'),
(70, 7, 'workflow_task', 14, 'workflow_task.created', '{\"repair_id\":11,\"ticket_number\":\"RF-1793593172215-1415\",\"task_type\":\"manual_follow_up\",\"priority\":\"high\",\"source\":\"manual\"}', '2026-11-02 04:25:47'),
(71, 7, 'workflow_task', 14, 'workflow_task.resolved', '{\"repair_id\":11,\"note\":\"i removed shorted capacitor from board , then battery drain is fixed\"}', '2026-11-02 04:27:24'),
(72, NULL, 'workflow', NULL, 'workflow.check_completed', '{\"overdue_checked\":0,\"waiting_for_part_checked\":0,\"stale_checked\":0,\"tasks_created\":0}', '2026-11-02 04:27:53'),
(73, 7, 'product', 3, 'product.created', NULL, '2026-11-02 04:30:20'),
(74, 7, 'customer', 3, 'customer.updated', NULL, '2026-11-02 05:25:40'),
(75, 7, 'customer', 9, 'customer.created', NULL, '2026-11-02 05:43:10'),
(76, 7, 'repair', 12, 'repair.created', '{\"ticket_number\":\"RF-1793598299951-3655\"}', '2026-11-02 05:45:00'),
(77, NULL, 'diagnosis', 40, 'diagnosis.generated', '{\"repair_id\":12,\"provider\":\"Gemini\"}', '2026-11-02 05:46:41'),
(78, 7, 'workflow_task', 15, 'workflow_task.created', '{\"repair_id\":12,\"ticket_number\":\"RF-1793598299951-3655\",\"task_type\":\"manual_follow_up\",\"priority\":\"medium\",\"source\":\"manual\"}', '2026-11-02 05:49:11'),
(79, 7, 'workflow_task', 15, 'workflow_task.resolved', '{\"repair_id\":12,\"note\":\"i have to check one by one\"}', '2026-11-02 05:49:57'),
(80, 7, 'product', 4, 'product.created', NULL, '2026-11-02 05:51:11');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `email` varchar(254) DEFAULT NULL,
  `telegram_chat_id` varchar(100) DEFAULT NULL,
  `notification_consent` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `full_name`, `phone`, `email`, `telegram_chat_id`, `notification_consent`, `created_at`, `updated_at`) VALUES
(3, 'Abebe Kebede', '0912345678', 'abebe@example.com', NULL, 1, '2026-10-15 14:20:57', '2026-11-02 05:25:40'),
(4, 'tilahun abebe', '0912345678', 'tilish@gmail.com', NULL, 0, '2026-10-15 14:26:18', '2026-10-15 14:39:21'),
(7, 'Yibeltal Ayalneh Ejigu', '0924922997', 'yibeltal2514@gmail.com', NULL, 1, '2026-10-18 05:22:33', '2026-10-18 05:22:33'),
(8, 'abebe alemu kebede', '0915695006', 'abebealemu@gmail.com', NULL, 1, '2026-11-02 04:16:53', '2026-11-02 04:16:53'),
(9, 'test', '0962760536', 'tests@gmail.com', NULL, 0, '2026-11-02 05:43:09', '2026-11-02 05:43:09');

-- --------------------------------------------------------

--
-- Table structure for table `diagnosis_sessions`
--

CREATE TABLE `diagnosis_sessions` (
  `diagnosis_session_id` bigint(20) UNSIGNED NOT NULL,
  `repair_id` bigint(20) UNSIGNED NOT NULL,
  `provider` varchar(80) NOT NULL DEFAULT 'Gemini',
  `model_name` varchar(120) DEFAULT NULL,
  `input_summary` text NOT NULL,
  `structured_suggestions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`structured_suggestions`)),
  `uncertainty_notes` text DEFAULT NULL,
  `status` enum('pending_review','approved','rejected','edited','failed') NOT NULL DEFAULT 'pending_review',
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `diagnosis_sessions`
--

INSERT INTO `diagnosis_sessions` (`diagnosis_session_id`, `repair_id`, `provider`, `model_name`, `input_summary`, `structured_suggestions`, `uncertainty_notes`, `status`, `reviewed_by`, `reviewed_at`, `created_at`) VALUES
(39, 11, 'Gemini', NULL, '{\"symptoms\":\"battery battery drain in fast\",\"previous_attempts\":\"\",\"measurements\":\"\",\"additional_context\":\"\",\"diagnostic_tests\":[]}', '{\"summary\":\"The Tecno Pop 10 device experiences rapid battery drain, depleting within a few minutes.\",\"possible_causes\":[{\"cause\":\"Degraded or failing battery cell\",\"rationale\":\"Extremely fast battery drain is frequently caused by a chemically degraded or damaged battery that has lost its capacity and internal resistance stability.\",\"uncertainty\":\"Medium\",\"evidence\":[\"Battery drains in a few minutes\",\"Battery drains fast\"]},{\"cause\":\"Hardware short circuit on the motherboard\",\"rationale\":\"A shorted component (such as a power management IC, capacitor, or transceiver) can draw excessive current, causing rapid discharge and overheating.\",\"uncertainty\":\"Medium\",\"evidence\":[\"Battery drains in a few minutes\"]},{\"cause\":\"Severe software background process or OS corruption\",\"rationale\":\"An application stuck in a continuous loop or a corrupted operating system build can keep the CPU at maximum frequency, rapidly draining the battery.\",\"uncertainty\":\"Low to Medium\",\"evidence\":[\"Battery drains fast\"]}],\"recommended_tests\":[\"Check battery health and percentage drop rate in device settings or via a power meter.\",\"Perform a factory reset or test in safe mode to rule out rogue applications.\",\"Measure current draw using a DC power supply or USB power meter to check for abnormal quiescent current or short circuits.\"],\"required_tools\":[\"Multimeter\",\"DC power supply\",\"USB power meter\",\"Precision screwdriver set\",\"Spudger and opening tools\"],\"potentially_relevant_parts\":[\"Battery\",\"Power Management IC (PMIC)\",\"Motherboard\"],\"safety_notes\":[\"Exercise caution when handling lithium-ion batteries to prevent punctures, short circuits, and thermal runaway.\",\"Disconnect the battery before performing any internal motherboard inspections or repairs.\"],\"missing_information\":[\"Exact battery percentage drop rate over time\",\"Whether the phone feels warm or hot during standby or use\",\"Current drain measurements\",\"Whether the issue persists in safe mode or after a factory reset\"],\"limitations\":[\"No technician measurements or verified test results were provided.\",\"Diagnosis is based solely on reported symptoms without physical inspection data.\"]}', 'Additional evidence is required.', 'pending_review', NULL, NULL, '2026-11-02 04:21:46'),
(40, 12, 'Gemini', NULL, '{\"symptoms\":\"there is no light totally from phone\",\"previous_attempts\":\"\",\"measurements\":\"\",\"additional_context\":\"\",\"diagnostic_tests\":[]}', '{\"summary\":\"The user reports a screen-related problem on a Samsung M14 where there is totally no light from the phone.\",\"possible_causes\":[{\"cause\":\"Display backlight failure\",\"rationale\":\"The symptom of total lack of light from the phone strongly suggests an issue with the display backlight circuit or the display panel itself.\",\"uncertainty\":\"High, due to a complete lack of diagnostic measurements, test results, or known history.\",\"evidence\":[\"Reported issue: screen related problem\",\"Additional symptoms: there is no light totally from phone\"]},{\"cause\":\"Battery depletion or charging system failure\",\"rationale\":\"A completely dead battery or a failure in the charging circuit can prevent the phone from powering on at all, resulting in no screen light.\",\"uncertainty\":\"Medium\",\"evidence\":[\"Additional symptoms: there is no light totally from phone\"]},{\"cause\":\"Mainboard or display connector issue\",\"rationale\":\"A dislodged or damaged display flex cable can cause the screen to remain completely dark.\",\"uncertainty\":\"Medium\",\"evidence\":[\"Reported issue: screen related problem\"]}],\"recommended_tests\":[\"Check charging current with a USB power meter\",\"Inspect the display flex cable and connector on the motherboard\",\"Test with a known good display assembly\",\"Check for any signs of vibration or audio feedback when pressing the power button\"],\"required_tools\":[\"Multimeter\",\"Precision screwdriver set\",\"Plastic pry tools\",\"USB power meter\",\"Known good Samsung M14 display\"],\"potentially_relevant_parts\":[\"Samsung M14 display assembly\",\"Battery\",\"Mainboard\"],\"safety_notes\":[\"Disconnect the battery before performing any internal inspections or repairs to avoid short circuits.\",\"Handle the display glass with care to prevent cuts or further damage.\"],\"missing_information\":[\"Whether the phone vibrates or makes sounds when connected to a charger or when the power button is pressed\",\"Battery voltage measurements\",\"Visual inspection results of the screen and housing for physical or liquid damage\"],\"limitations\":[\"Diagnostic is based solely on limited user-reported symptoms without technician measurements or verified test results.\",\"Definite component failure cannot be determined without physical inspection and testing.\"]}', 'Additional evidence is required.', 'pending_review', NULL, NULL, '2026-11-02 05:46:41');

-- --------------------------------------------------------

--
-- Table structure for table `diagnostic_tests`
--

CREATE TABLE `diagnostic_tests` (
  `diagnostic_test_id` bigint(20) UNSIGNED NOT NULL,
  `repair_id` bigint(20) UNSIGNED NOT NULL,
  `diagnosis_session_id` bigint(20) UNSIGNED DEFAULT NULL,
  `test_name` varchar(150) NOT NULL,
  `measurement` varchar(150) DEFAULT NULL,
  `result` text DEFAULT NULL,
  `technician_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `integration_sync_logs`
--

CREATE TABLE `integration_sync_logs` (
  `integration_sync_log_id` bigint(20) UNSIGNED NOT NULL,
  `integration_name` enum('telegram','google_sheets','other') NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `entity_type` varchar(80) DEFAULT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('pending','success','failed','retrying') NOT NULL DEFAULT 'pending',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `last_error` text DEFAULT NULL,
  `next_retry_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `integration_sync_logs`
--

INSERT INTO `integration_sync_logs` (`integration_sync_log_id`, `integration_name`, `event_type`, `entity_type`, `entity_id`, `status`, `attempts`, `last_error`, `next_retry_at`, `created_at`, `updated_at`) VALUES
(15, 'telegram', 'telegram.test', 'integration', NULL, 'success', 1, NULL, NULL, '2026-11-02 05:55:20', '2026-11-02 05:55:20');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` bigint(20) UNSIGNED NOT NULL,
  `repair_id` bigint(20) UNSIGNED DEFAULT NULL,
  `channel` enum('telegram','email','sms','other') NOT NULL,
  `recipient` varchar(254) NOT NULL,
  `message` text NOT NULL,
  `status` enum('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `attempts` int(11) NOT NULL DEFAULT 0,
  `sent_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `repair_id`, `channel`, `recipient`, `message`, `status`, `error_message`, `attempts`, `sent_at`, `created_at`) VALUES
(1, NULL, 'telegram', '251911234567', 'Your repair has been received and is now under diagnosis.', 'pending', NULL, 0, NULL, '2026-10-16 06:18:48'),
(2, 11, 'email', 'abebekebede@gmail.com', 'cczx', 'pending', NULL, 0, NULL, '2026-11-02 05:28:13'),
(3, 12, 'email', 'tests@gmail.com', 'your phone is fixed', 'pending', NULL, 0, NULL, '2026-11-02 05:52:57');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `sku` varchar(80) NOT NULL,
  `name` varchar(180) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `quantity_on_hand` int(11) NOT NULL DEFAULT 0,
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `unit_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `sku`, `name`, `category`, `quantity_on_hand`, `reorder_level`, `unit_cost`, `selling_price`, `created_at`, `updated_at`) VALUES
(2, 'Sam-A05', 'Samsung-A05', 'screen', 1, 1, 2000.00, 2400.00, '2026-10-18 10:14:21', '2026-10-18 10:15:01'),
(3, 'sam-A17', 'samsung a17', 'screen', 1, 1, 30000.00, 4000.00, '2026-11-02 04:30:20', '2026-11-02 04:30:20'),
(4, 'sam-24', 'Samsung-A24', 'screen', 1, 1, 2500.00, 3000.00, '2026-11-02 05:51:11', '2026-11-02 05:51:11');

-- --------------------------------------------------------

--
-- Table structure for table `repairs`
--

CREATE TABLE `repairs` (
  `repair_id` bigint(20) UNSIGNED NOT NULL,
  `ticket_number` varchar(40) NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `device_brand` varchar(100) NOT NULL,
  `device_model` varchar(150) NOT NULL,
  `reported_issue` text NOT NULL,
  `diagnosis_summary` text DEFAULT NULL,
  `status` enum('Received','Diagnosing','Waiting for Part','Waiting for Customer','In Repair','Ready for Pickup','Completed','Cancelled') NOT NULL DEFAULT 'Received',
  `estimated_cost` decimal(12,2) DEFAULT NULL,
  `final_cost` decimal(12,2) DEFAULT NULL,
  `promised_at` datetime DEFAULT NULL,
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `repairs`
--

INSERT INTO `repairs` (`repair_id`, `ticket_number`, `customer_id`, `device_brand`, `device_model`, `reported_issue`, `diagnosis_summary`, `status`, `estimated_cost`, `final_cost`, `promised_at`, `assigned_to`, `created_by`, `created_at`, `updated_at`) VALUES
(11, 'RF-1793593172215-1415', 8, 'Tecno', 'Tecno pop 10', 'these mobile battery is drain in few minutes', NULL, 'Received', 500.00, NULL, '2026-11-03 07:19:00', NULL, 7, '2026-11-02 04:19:32', '2026-11-02 04:19:32'),
(12, 'RF-1793598299951-3655', 9, 'sam-m14', 'samsung m14', 'sreen relaterd problem', NULL, 'Received', 3000.00, NULL, '2026-11-03 08:44:00', NULL, 7, '2026-11-02 05:44:59', '2026-11-02 05:44:59');

-- --------------------------------------------------------

--
-- Table structure for table `repair_status_history`
--

CREATE TABLE `repair_status_history` (
  `history_id` bigint(20) UNSIGNED NOT NULL,
  `repair_id` bigint(20) UNSIGNED NOT NULL,
  `old_status` varchar(40) DEFAULT NULL,
  `new_status` varchar(40) NOT NULL,
  `changed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `repair_status_history`
--

INSERT INTO `repair_status_history` (`history_id`, `repair_id`, `old_status`, `new_status`, `changed_by`, `note`, `created_at`) VALUES
(6, 11, NULL, 'Received', 7, 'Repair ticket created', '2026-11-02 04:19:32'),
(7, 12, NULL, 'Received', 7, 'Repair ticket created', '2026-11-02 05:45:00');

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `stock_movement_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `repair_id` bigint(20) UNSIGNED DEFAULT NULL,
  `movement_type` enum('received','used','adjustment','returned') NOT NULL,
  `quantity_delta` int(11) NOT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `telegram_link_tokens`
--

CREATE TABLE `telegram_link_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `telegram_link_tokens`
--

INSERT INTO `telegram_link_tokens` (`id`, `customer_id`, `token_hash`, `expires_at`, `used_at`, `created_at`) VALUES
(3, 4, '3be39815eab2598284250399d72eb7dd2c2a18d6adf50996599ad8c024ea43a5', '2026-10-17 18:51:13', NULL, '2026-10-17 15:36:13');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('owner','manager','technician','front_desk') NOT NULL DEFAULT 'technician',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
(6, 'Yibeltal Ayalneh', 'yibie@gmail.com', '$2a$12$2fRclq6RIdTmSY9qsaWTw.AvfX3xxtLIdiMtVypn318sfv6au6Qoa', 'manager', 1, '2026-10-15 13:07:37', '2026-10-15 14:15:56'),
(7, 'Meseret', 'mese@gmail.com', '$2a$12$ZR2at0b6DiqbNXseaKFXHenbnMGF0HGad02sapP93J./9pTWTYLAC', 'manager', 1, '2026-10-16 17:38:14', '2026-10-16 17:38:14');

-- --------------------------------------------------------

--
-- Table structure for table `workflow_tasks`
--

CREATE TABLE `workflow_tasks` (
  `workflow_task_id` bigint(20) UNSIGNED NOT NULL,
  `repair_id` bigint(20) UNSIGNED DEFAULT NULL,
  `task_type` varchar(80) NOT NULL,
  `reason` text NOT NULL,
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `assigned_to` bigint(20) UNSIGNED DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `status` enum('open','in_progress','resolved','dismissed') NOT NULL DEFAULT 'open',
  `deduplication_key` varchar(190) DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workflow_tasks`
--

INSERT INTO `workflow_tasks` (`workflow_task_id`, `repair_id`, `task_type`, `reason`, `priority`, `assigned_to`, `due_at`, `status`, `deduplication_key`, `resolved_at`, `created_at`, `updated_at`) VALUES
(14, 11, 'manual_follow_up', 'i must find shorted material from the mobile board,', 'high', NULL, '2026-11-03 07:25:00', 'resolved', 'manual:1793593546985:11:7', '2026-11-02 07:27:24', '2026-11-02 04:25:46', '2026-11-02 04:27:24'),
(15, 12, 'manual_follow_up', 'to fix black light', 'medium', NULL, '2026-11-03 08:49:00', 'resolved', 'manual:1793598551400:12:7', '2026-11-02 08:49:57', '2026-11-02 05:49:11', '2026-11-02 05:49:57');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_events`
--
ALTER TABLE `audit_events`
  ADD PRIMARY KEY (`audit_event_id`),
  ADD KEY `fk_audit_actor` (`actor_id`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_created_at` (`created_at`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD KEY `idx_customers_name` (`full_name`),
  ADD KEY `idx_customers_phone` (`phone`);

--
-- Indexes for table `diagnosis_sessions`
--
ALTER TABLE `diagnosis_sessions`
  ADD PRIMARY KEY (`diagnosis_session_id`),
  ADD KEY `fk_diagnosis_reviewer` (`reviewed_by`),
  ADD KEY `idx_diagnosis_repair_date` (`repair_id`,`created_at`),
  ADD KEY `idx_diagnosis_status` (`status`);

--
-- Indexes for table `diagnostic_tests`
--
ALTER TABLE `diagnostic_tests`
  ADD PRIMARY KEY (`diagnostic_test_id`),
  ADD KEY `fk_tests_diagnosis` (`diagnosis_session_id`),
  ADD KEY `fk_tests_technician` (`technician_id`),
  ADD KEY `idx_tests_repair_date` (`repair_id`,`created_at`);

--
-- Indexes for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  ADD PRIMARY KEY (`integration_sync_log_id`),
  ADD KEY `idx_integration_status_retry` (`status`,`next_retry_at`),
  ADD KEY `idx_integration_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_notifications_status` (`status`),
  ADD KEY `idx_notifications_repair` (`repair_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `idx_products_name` (`name`),
  ADD KEY `idx_products_category` (`category`);

--
-- Indexes for table `repairs`
--
ALTER TABLE `repairs`
  ADD PRIMARY KEY (`repair_id`),
  ADD UNIQUE KEY `ticket_number` (`ticket_number`),
  ADD KEY `fk_repairs_created_user` (`created_by`),
  ADD KEY `idx_repairs_status` (`status`),
  ADD KEY `idx_repairs_promised_at` (`promised_at`),
  ADD KEY `idx_repairs_assigned_to` (`assigned_to`),
  ADD KEY `idx_repairs_customer` (`customer_id`),
  ADD KEY `idx_repairs_created_at` (`created_at`);

--
-- Indexes for table `repair_status_history`
--
ALTER TABLE `repair_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `fk_status_history_user` (`changed_by`),
  ADD KEY `idx_status_history_repair_date` (`repair_id`,`created_at`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`stock_movement_id`),
  ADD KEY `fk_stock_user` (`created_by`),
  ADD KEY `idx_stock_product_date` (`product_id`,`created_at`),
  ADD KEY `idx_stock_repair` (`repair_id`);

--
-- Indexes for table `telegram_link_tokens`
--
ALTER TABLE `telegram_link_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token_hash` (`token_hash`),
  ADD KEY `idx_telegram_link_customer` (`customer_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `workflow_tasks`
--
ALTER TABLE `workflow_tasks`
  ADD PRIMARY KEY (`workflow_task_id`),
  ADD UNIQUE KEY `deduplication_key` (`deduplication_key`),
  ADD KEY `fk_tasks_assignee` (`assigned_to`),
  ADD KEY `idx_tasks_status_due` (`status`,`due_at`),
  ADD KEY `idx_tasks_repair` (`repair_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_events`
--
ALTER TABLE `audit_events`
  MODIFY `audit_event_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `diagnosis_sessions`
--
ALTER TABLE `diagnosis_sessions`
  MODIFY `diagnosis_session_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `diagnostic_tests`
--
ALTER TABLE `diagnostic_tests`
  MODIFY `diagnostic_test_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `integration_sync_logs`
--
ALTER TABLE `integration_sync_logs`
  MODIFY `integration_sync_log_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `repairs`
--
ALTER TABLE `repairs`
  MODIFY `repair_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `repair_status_history`
--
ALTER TABLE `repair_status_history`
  MODIFY `history_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `stock_movement_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `telegram_link_tokens`
--
ALTER TABLE `telegram_link_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `workflow_tasks`
--
ALTER TABLE `workflow_tasks`
  MODIFY `workflow_task_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_events`
--
ALTER TABLE `audit_events`
  ADD CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `diagnosis_sessions`
--
ALTER TABLE `diagnosis_sessions`
  ADD CONSTRAINT `fk_diagnosis_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_diagnosis_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `diagnostic_tests`
--
ALTER TABLE `diagnostic_tests`
  ADD CONSTRAINT `fk_tests_diagnosis` FOREIGN KEY (`diagnosis_session_id`) REFERENCES `diagnosis_sessions` (`diagnosis_session_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tests_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tests_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `repairs`
--
ALTER TABLE `repairs`
  ADD CONSTRAINT `fk_repairs_assigned_user` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_repairs_created_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_repairs_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE;

--
-- Constraints for table `repair_status_history`
--
ALTER TABLE `repair_status_history`
  ADD CONSTRAINT `fk_status_history_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_status_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_stock_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `telegram_link_tokens`
--
ALTER TABLE `telegram_link_tokens`
  ADD CONSTRAINT `fk_telegram_link_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE;

--
-- Constraints for table `workflow_tasks`
--
ALTER TABLE `workflow_tasks`
  ADD CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tasks_repair` FOREIGN KEY (`repair_id`) REFERENCES `repairs` (`repair_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
