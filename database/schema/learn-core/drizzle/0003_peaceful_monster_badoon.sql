CREATE TABLE `oauth_accounts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`provider` varchar(30) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `oauth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `oauth_accounts_provider_account_idx` UNIQUE(`provider`,`provider_account_id`)
);
--> statement-breakpoint
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;