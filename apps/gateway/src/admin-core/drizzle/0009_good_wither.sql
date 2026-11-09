CREATE TABLE `add_on_services` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`starting_price_usd` decimal(10,2),
	`status` enum('draft','active','disabled') NOT NULL DEFAULT 'draft',
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `add_on_services_id` PRIMARY KEY(`id`),
	CONSTRAINT `add_on_services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `consultation_settings` (
	`id` varchar(36) NOT NULL,
	`fee_usd` decimal(10,2) NOT NULL DEFAULT '150.00',
	`duration_minutes` int NOT NULL DEFAULT 45,
	`is_refundable` boolean NOT NULL DEFAULT false,
	`refund_policy_text` text,
	`updated_by_user_id` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `consultation_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`currency_code` varchar(3) NOT NULL,
	`rate_to_usd` decimal(18,8) NOT NULL,
	`fetched_at` datetime NOT NULL,
	CONSTRAINT `fx_rates_currency_code` PRIMARY KEY(`currency_code`)
);
--> statement-breakpoint
CREATE TABLE `pricing_plans` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` text NOT NULL,
	`target_audience` text,
	`category` enum('assurance','managed_security') NOT NULL DEFAULT 'assurance',
	`monthly_price_usd` decimal(10,2),
	`is_starting_at_price` boolean NOT NULL DEFAULT false,
	`min_contract_months` int NOT NULL DEFAULT 3,
	`included_features` json NOT NULL DEFAULT ('[]'),
	`included_asset_limit` int,
	`included_analyst_hours_per_month` int,
	`is_recommended` boolean NOT NULL DEFAULT false,
	`status` enum('draft','active','disabled') NOT NULL DEFAULT 'draft',
	`cta_label` text,
	`requires_enterprise_contact` boolean NOT NULL DEFAULT false,
	`requires_24x7_readiness` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `pricing_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `soc_readiness_settings` (
	`id` varchar(36) NOT NULL,
	`availability` enum('disabled','inquiry_only','active') NOT NULL DEFAULT 'disabled',
	`notes` text,
	`updated_by_user_id` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `soc_readiness_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `consultations` ADD `company_name` text;--> statement-breakpoint
ALTER TABLE `consultations` ADD `industry` text;--> statement-breakpoint
ALTER TABLE `consultations` ADD `website` text;--> statement-breakpoint
ALTER TABLE `consultations` ADD `company_size` enum('startup','small','medium','large','enterprise');--> statement-breakpoint
ALTER TABLE `consultations` ADD `number_of_employees` varchar(50);--> statement-breakpoint
ALTER TABLE `consultations` ADD `security_concern` text;--> statement-breakpoint
ALTER TABLE `consultations` ADD `preferred_package_slug` varchar(100);--> statement-breakpoint
ALTER TABLE `consultations` ADD `timezone` varchar(100);--> statement-breakpoint
ALTER TABLE `consultations` ADD `additional_information` text;--> statement-breakpoint
ALTER TABLE `consultations` ADD `fee_usd` decimal(10,2);--> statement-breakpoint
ALTER TABLE `consultations` ADD `displayed_currency` varchar(3);--> statement-breakpoint
ALTER TABLE `consultations` ADD `displayed_amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `consultations` ADD `fx_rate_timestamp` datetime;--> statement-breakpoint
ALTER TABLE `consultations` ADD `country_detection_source` varchar(20);--> statement-breakpoint
ALTER TABLE `consultations` ADD `invoice_id` varchar(36);--> statement-breakpoint
ALTER TABLE `consultations` ADD `payment_id` varchar(36);--> statement-breakpoint
ALTER TABLE `consultations` ADD `payment_status` enum('pending','pending_verification','succeeded','failed','refunded');