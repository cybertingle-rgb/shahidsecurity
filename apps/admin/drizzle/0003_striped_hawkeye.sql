CREATE TABLE `publications` (
	`id` varchar(36) NOT NULL,
	`content_type` enum('blog_post','seo_page') NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`target_slug_or_path` varchar(500) NOT NULL,
	`status` enum('publishing','building','deploying','published','failed') NOT NULL DEFAULT 'publishing',
	`commit_sha` varchar(40),
	`previous_commit_sha` varchar(40),
	`workflow_run_id` varchar(50),
	`error_message` text,
	`published_by_user_id` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `publications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analytics_connections` ADD `property_name` text;--> statement-breakpoint
ALTER TABLE `analytics_connections` ADD `timezone` text;--> statement-breakpoint
ALTER TABLE `analytics_connections` ADD `currency` text;--> statement-breakpoint
ALTER TABLE `analytics_connections` ADD `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `google_business_profiles` ADD `google_account_id` text;--> statement-breakpoint
ALTER TABLE `search_console_connections` ADD `permission_level` text;--> statement-breakpoint
ALTER TABLE `search_console_connections` ADD `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;