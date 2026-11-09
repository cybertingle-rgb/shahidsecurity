CREATE TABLE `payment_methods` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`type` enum('bank_transfer','crypto','mobile_wallet','other') NOT NULL,
	`instructions` text,
	`wallet_address` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `method` enum('online','manual') NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `payment_method_id` varchar(36);--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_payment_method_id_payment_methods_id_fk` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE set null ON UPDATE no action;