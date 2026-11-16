CREATE TABLE `admin_auth_events` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`event_type` enum('login_success','login_failed','logout','password_changed') NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`metadata` json,
	`created_at` datetime NOT NULL,
	CONSTRAINT `admin_auth_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_permissions` (
	`id` varchar(36) NOT NULL,
	`key` varchar(150) NOT NULL,
	`description` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `admin_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_permissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `admin_role_permissions` (
	`role_id` varchar(36) NOT NULL,
	`permission_id` varchar(36) NOT NULL,
	CONSTRAINT `admin_role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `admin_roles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `admin_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`session_token_hash` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_user_roles` (
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	CONSTRAINT `admin_user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`last_login_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`action` varchar(150) NOT NULL,
	`target_type` varchar(100),
	`target_id` text,
	`metadata` json,
	`ip_address` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limit_hits` (
	`id` varchar(36) NOT NULL,
	`bucket_key` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `rate_limit_hits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_settings` (
	`id` varchar(36) NOT NULL,
	`legal_name` text,
	`display_name` text,
	`description` text,
	`email` varchar(255),
	`phone` varchar(50),
	`address_line_1` text,
	`address_line_2` text,
	`city` text,
	`region` text,
	`postal_code` varchar(20),
	`country_code` varchar(2),
	`latitude` text,
	`longitude` text,
	`opening_hours` json,
	`logo_media_id` varchar(36),
	`updated_by_user_id` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `business_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_studies` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`body_markdown` text,
	`service_id` varchar(36),
	`client_name_disclosed` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `case_studies_id` PRIMARY KEY(`id`),
	CONSTRAINT `case_studies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `faqs` (
	`id` varchar(36) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`service_id` varchar(36),
	`sort_order` int NOT NULL DEFAULT 0,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`created_at` datetime NOT NULL,
	CONSTRAINT `faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`name` text NOT NULL,
	`short_description` text,
	`body_markdown` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`seo_title` text,
	`seo_description` text,
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `social_profiles` (
	`id` varchar(36) NOT NULL,
	`platform` varchar(50) NOT NULL,
	`url` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	CONSTRAINT `social_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_conversations` (
	`id` varchar(36) NOT NULL,
	`started_at` datetime NOT NULL,
	`metadata` json,
	CONSTRAINT `ai_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_knowledge_sources` (
	`id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`body_markdown` text NOT NULL,
	`status` enum('draft','approved','rejected') NOT NULL DEFAULT 'draft',
	`approved_by_user_id` varchar(36),
	`approved_at` datetime,
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `ai_knowledge_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_questions` (
	`id` varchar(36) NOT NULL,
	`question_text` text NOT NULL,
	`conversation_id` varchar(36),
	`reviewed_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `ai_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_authors` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`bio` text,
	`avatar_media_id` varchar(36),
	`admin_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `blog_authors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	CONSTRAINT `blog_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_faqs` (
	`id` varchar(36) NOT NULL,
	`post_id` varchar(36) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `blog_post_faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_relations` (
	`post_id` varchar(36) NOT NULL,
	`related_post_id` varchar(36) NOT NULL,
	CONSTRAINT `blog_post_relations_post_id_related_post_id_pk` PRIMARY KEY(`post_id`,`related_post_id`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_tags` (
	`post_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `blog_post_tags_post_id_tag_id_pk` PRIMARY KEY(`post_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`body_markdown` text,
	`author_id` varchar(36),
	`category_id` varchar(36),
	`related_service_slug` varchar(150),
	`seo_title` text,
	`seo_description` text,
	`cover_media_id` varchar(36),
	`status` enum('draft','scheduled','published') NOT NULL DEFAULT 'draft',
	`published_at` datetime,
	`scheduled_for` datetime,
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `blog_tags` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT `blog_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`file_name` text NOT NULL,
	`storage_path` text NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`width` int,
	`height` int,
	`alt_text` text,
	`uploaded_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` varchar(36) NOT NULL,
	`lead_id` varchar(36),
	`full_name` text NOT NULL,
	`email` varchar(255) NOT NULL,
	`requested_at` datetime NOT NULL,
	`status` enum('requested','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'requested',
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`full_name` text NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`company` text,
	`converted_from_lead_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`invoice_number` varchar(50) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`amount_due` decimal(10,2) NOT NULL,
	`status` enum('draft','sent','paid','void','overdue') NOT NULL DEFAULT 'draft',
	`due_date` datetime,
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoice_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`full_name` text NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`company` text,
	`message` text,
	`source` varchar(100),
	`status` enum('new','contacted','qualified','converted','lost') NOT NULL DEFAULT 'new',
	`assigned_to_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_method_ref` text NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`label` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`invoice_id` varchar(36),
	`customer_id` varchar(36) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`provider_payment_ref` text,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` enum('pending','succeeded','failed','refunded') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`recorded_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_requests` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`requested_by_user_id` varchar(36),
	`sent_at` datetime NOT NULL,
	`status` enum('sent','completed','declined') NOT NULL DEFAULT 'sent',
	CONSTRAINT `review_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` varchar(36) NOT NULL,
	`customer_id` varchar(36),
	`author_name` text NOT NULL,
	`quote` text NOT NULL,
	`source_url` text,
	`verification_status` enum('pending','verified','unverified') NOT NULL DEFAULT 'pending',
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_connections` (
	`id` varchar(36) NOT NULL,
	`connection_id` varchar(36) NOT NULL,
	`property_id` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `analytics_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `google_business_profiles` (
	`id` varchar(36) NOT NULL,
	`connection_id` varchar(36) NOT NULL,
	`google_location_id` text,
	`location_name` text,
	`average_rating` text,
	`review_count` text,
	`last_fetched_at` datetime,
	CONSTRAINT `google_business_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `google_connections` (
	`id` varchar(36) NOT NULL,
	`scope` enum('business_profile','analytics','search_console') NOT NULL,
	`google_account_email` text,
	`access_token_enc` text,
	`refresh_token_enc` text,
	`token_expires_at` datetime,
	`granted_scopes` text,
	`connected_by_user_id` varchar(36),
	`status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`last_synced_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `google_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `google_sync_logs` (
	`id` varchar(36) NOT NULL,
	`connection_id` varchar(36) NOT NULL,
	`sync_type` varchar(100) NOT NULL,
	`status` enum('success','error') NOT NULL,
	`error_message` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `google_sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_console_connections` (
	`id` varchar(36) NOT NULL,
	`connection_id` varchar(36) NOT NULL,
	`site_url` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `search_console_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seo_pages` (
	`id` varchar(36) NOT NULL,
	`path` varchar(500) NOT NULL,
	`title` text,
	`description` text,
	`canonical_url` text,
	`robots_directive` varchar(100),
	`updated_by_user_id` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `seo_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `seo_pages_path_unique` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `seo_redirects` (
	`id` varchar(36) NOT NULL,
	`from_path` varchar(500) NOT NULL,
	`to_url` text NOT NULL,
	`status_code` enum('301','302') NOT NULL DEFAULT '301',
	`created_by_user_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `seo_redirects_id` PRIMARY KEY(`id`),
	CONSTRAINT `seo_redirects_from_path_unique` UNIQUE(`from_path`)
);
--> statement-breakpoint
ALTER TABLE `admin_auth_events` ADD CONSTRAINT `admin_auth_events_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_role_permissions` ADD CONSTRAINT `admin_role_permissions_role_id_admin_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_role_permissions` ADD CONSTRAINT `admin_role_permissions_permission_id_admin_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `admin_permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_user_roles` ADD CONSTRAINT `admin_user_roles_user_id_admin_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_user_roles` ADD CONSTRAINT `admin_user_roles_role_id_admin_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `admin_roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_faqs` ADD CONSTRAINT `blog_post_faqs_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_relations` ADD CONSTRAINT `blog_post_relations_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_relations` ADD CONSTRAINT `blog_post_relations_related_post_id_blog_posts_id_fk` FOREIGN KEY (`related_post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_post_id_blog_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_tag_id_blog_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `blog_tags`(`id`) ON DELETE cascade ON UPDATE no action;