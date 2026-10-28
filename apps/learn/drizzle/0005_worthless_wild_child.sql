CREATE TABLE `training_requests` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`contact_name` text NOT NULL,
	`contact_email` varchar(255) NOT NULL,
	`area_of_interest` text NOT NULL,
	`experience_level` enum('beginner','intermediate','advanced','expert') NOT NULL,
	`goals` text NOT NULL,
	`special_request` text,
	`format_preference` enum('one_on_one','group','no_preference') NOT NULL DEFAULT 'no_preference',
	`preferred_availability` text,
	`status` enum('new','reviewing','contacted','approved','declined','converted') NOT NULL DEFAULT 'new',
	`internal_notes` text,
	`agreed_price_amount` int,
	`agreed_currency_code` varchar(3),
	`converted_order_id` varchar(36),
	`reviewed_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `training_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `training_requests` ADD CONSTRAINT `training_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_requests` ADD CONSTRAINT `training_requests_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_requests` ADD CONSTRAINT `training_requests_converted_order_id_orders_id_fk` FOREIGN KEY (`converted_order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_requests` ADD CONSTRAINT `training_requests_reviewed_by_user_id_users_id_fk` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;