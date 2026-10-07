CREATE TABLE `manual_payment_methods` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`type` enum('bank_transfer','crypto','mobile_wallet','other') NOT NULL,
	`instructions` text,
	`wallet_address` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `manual_payment_methods_id` PRIMARY KEY(`id`)
);
