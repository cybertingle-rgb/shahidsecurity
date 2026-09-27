CREATE TABLE `auth_events` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`event_type` enum('login_success','login_failed','logout','register','email_verified','password_reset_requested','password_reset_completed','suspicious_login') NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`metadata` json,
	`created_at` datetime NOT NULL,
	CONSTRAINT `auth_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(36) NOT NULL,
	`key` varchar(150) NOT NULL,
	`description` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `rate_limit_hits` (
	`id` varchar(36) NOT NULL,
	`bucket_key` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `rate_limit_hits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` varchar(36) NOT NULL,
	`permission_id` varchar(36) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`session_token_hash` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	CONSTRAINT `user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`country_code` text,
	`phone` text,
	`username` varchar(100),
	`email_verified_at` datetime,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`last_login_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_idx` UNIQUE(`email`),
	CONSTRAINT `users_username_idx` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `course_modules` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `course_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`short_description` text,
	`full_description` text,
	`thumbnail_url` text,
	`instructor_id` varchar(36),
	`category` text,
	`level` enum('beginner','intermediate','advanced','expert') NOT NULL DEFAULT 'beginner',
	`duration_minutes` int,
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`status` enum('draft','review','published','archived') NOT NULL DEFAULT 'draft',
	`published_at` datetime,
	`featured` boolean NOT NULL DEFAULT false,
	`seo_title` text,
	`seo_description` text,
	`canonical_url` text,
	`og_image_url` text,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `instructors` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`display_name` text NOT NULL,
	`bio` text,
	`photo_url` text,
	`credentials_text` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `instructors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_video_sources` (
	`id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`provider` enum('youtube_unlisted','vimeo','cloud_storage','other') NOT NULL,
	`provider_reference` text NOT NULL,
	`notes` text,
	CONSTRAINT `lesson_video_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`type` enum('video','text','pdf','image','code','quiz','assignment','external_resource','download') NOT NULL,
	`content` json,
	`is_free_preview` boolean NOT NULL DEFAULT false,
	`requires_enrollment` boolean NOT NULL DEFAULT true,
	`drip_release_at` datetime,
	`drip_release_days_after_enrollment` int,
	`estimated_duration_minutes` int,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_usage` (
	`id` varchar(36) NOT NULL,
	`coupon_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`used_at` datetime NOT NULL,
	CONSTRAINT `coupon_usage_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_usage_coupon_user_idx` UNIQUE(`coupon_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`discount_type` enum('percentage','fixed') NOT NULL,
	`discount_value` int NOT NULL,
	`expires_at` datetime,
	`usage_limit` int,
	`per_user_limit` int DEFAULT 1,
	`applicable_product_ids` json,
	`minimum_order_amount` int,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `manual_payment_submissions` (
	`id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`transaction_reference` text NOT NULL,
	`amount_claimed` int NOT NULL,
	`payment_date` datetime NOT NULL,
	`receipt_file_url` text,
	`admin_notes` text,
	`status` enum('pending','approved','rejected','clarification_requested') NOT NULL DEFAULT 'pending',
	CONSTRAINT `manual_payment_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`unit_amount` int NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`currency_code` varchar(3) NOT NULL,
	`discount_amount` int NOT NULL DEFAULT 0,
	`coupon_id` varchar(36),
	`payment_provider` text,
	`payment_reference` text,
	`status` enum('pending','paid','failed','cancelled','refunded','partially_refunded') NOT NULL DEFAULT 'pending',
	`created_at` datetime NOT NULL,
	`paid_at` datetime,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`provider` text NOT NULL,
	`provider_payment_id` text,
	`amount` int NOT NULL,
	`currency_code` varchar(3) NOT NULL,
	`status` enum('pending_verification','succeeded','failed','refunded') NOT NULL DEFAULT 'pending_verification',
	`method` enum('online','manual_bank_transfer') NOT NULL,
	`verified_by_user_id` varchar(36),
	`verified_at` datetime,
	`idempotency_key` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`currency_code` varchar(3) NOT NULL,
	`country_code` varchar(2),
	`amount` int NOT NULL,
	`sale_amount` int,
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `prices_product_currency_country_idx` UNIQUE(`product_id`,`currency_code`,`country_code`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`type` enum('course','membership','bundle','workshop','bootcamp','mentoring','digital_product','live_class') NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`status` enum('draft','active','inactive') NOT NULL DEFAULT 'draft',
	`access_rules` json,
	`duration_days` int,
	`instructor_id` varchar(36),
	`seo` json,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` varchar(36) NOT NULL,
	`payment_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`reason` text,
	`status` enum('requested','approved','rejected','processed') NOT NULL DEFAULT 'requested',
	`requested_by_user_id` varchar(36) NOT NULL,
	`processed_by_user_id` varchar(36),
	`processed_at` datetime,
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignment_submissions` (
	`id` varchar(36) NOT NULL,
	`assignment_id` varchar(36) NOT NULL,
	`enrollment_id` varchar(36) NOT NULL,
	`content` json,
	`file_url` text,
	`status` enum('submitted','reviewed','needs_revision') NOT NULL DEFAULT 'submitted',
	`instructor_feedback` text,
	`submitted_at` datetime NOT NULL,
	`reviewed_at` datetime,
	CONSTRAINT `assignment_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`instructions` text NOT NULL,
	`submission_type` enum('text','file_upload','external_link') NOT NULL,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_progress` (
	`id` varchar(36) NOT NULL,
	`enrollment_id` varchar(36) NOT NULL,
	`percent_complete` int NOT NULL DEFAULT 0,
	`last_lesson_id` varchar(36),
	`updated_at` datetime NOT NULL,
	CONSTRAINT `course_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_progress_enrollment_id_unique` UNIQUE(`enrollment_id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` varchar(36),
	`product_id` varchar(36),
	`source` enum('purchase','membership','manual_admin_grant','coupon') NOT NULL,
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`enrolled_at` datetime NOT NULL,
	`expires_at` datetime,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`id` varchar(36) NOT NULL,
	`enrollment_id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`watch_progress_seconds` int,
	`started_at` datetime,
	`completed_at` datetime,
	CONSTRAINT `lesson_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` varchar(36) NOT NULL,
	`quiz_id` varchar(36) NOT NULL,
	`enrollment_id` varchar(36) NOT NULL,
	`answers` json,
	`score_percentage` int,
	`passed` boolean,
	`started_at` datetime NOT NULL,
	`submitted_at` datetime,
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` varchar(36) NOT NULL,
	`quiz_id` varchar(36) NOT NULL,
	`type` enum('multiple_choice','multiple_answer','true_false','short_answer') NOT NULL,
	`prompt` text NOT NULL,
	`options` json,
	`correct_answer` json,
	`explanation` text,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`passing_percentage` int NOT NULL DEFAULT 70,
	`max_attempts` int,
	`randomize_questions` boolean NOT NULL DEFAULT false,
	`time_limit_minutes` int,
	`show_answers_after_submit` boolean NOT NULL DEFAULT true,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_verifications` (
	`id` varchar(36) NOT NULL,
	`certificate_id` varchar(36) NOT NULL,
	`verified_at` datetime NOT NULL,
	`verifier_ip` text,
	CONSTRAINT `certificate_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` varchar(36) NOT NULL,
	`certificate_number` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`enrollment_id` varchar(36) NOT NULL,
	`issued_at` datetime NOT NULL,
	`instructor_id` varchar(36),
	`title` varchar(255) NOT NULL DEFAULT 'Certificate of Course Completion',
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_certificate_number_unique` UNIQUE(`certificate_number`)
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`platform` enum('discord','facebook','telegram','whatsapp','other') NOT NULL,
	`url` text NOT NULL,
	`required_product_id` varchar(36),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `communities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_access` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`community_id` varchar(36) NOT NULL,
	`status` enum('not_eligible','eligible','invitation_pending','invited','joined','revoked') NOT NULL DEFAULT 'not_eligible',
	`invited_at` datetime,
	`joined_at` datetime,
	`notes` text,
	CONSTRAINT `community_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`started_at` datetime NOT NULL,
	`expires_at` datetime,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`target_type` enum('all','membership','course','group') NOT NULL DEFAULT 'all',
	`target_id` varchar(36),
	`channels` json,
	`published_at` datetime NOT NULL,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_class_attendance` (
	`id` varchar(36) NOT NULL,
	`live_class_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`joined_at` datetime,
	`attended` boolean NOT NULL DEFAULT false,
	CONSTRAINT `live_class_attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_classes` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36),
	`instructor_id` varchar(36) NOT NULL,
	`scheduled_at` datetime NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Karachi',
	`meeting_url` text NOT NULL,
	`recording_url` text,
	`status` enum('scheduled','live','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	CONSTRAINT `live_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` varchar(36) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` enum('article','tool','video','external_link','download') NOT NULL,
	`url_or_file` text NOT NULL,
	`related_roadmap_stage_id` varchar(36),
	`related_course_id` varchar(36),
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	CONSTRAINT `resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roadmap_stage_resources` (
	`id` varchar(36) NOT NULL,
	`roadmap_stage_id` varchar(36) NOT NULL,
	`course_id` varchar(36),
	`resource_id` varchar(36),
	`external_links` json,
	CONSTRAINT `roadmap_stage_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roadmap_stages` (
	`id` varchar(36) NOT NULL,
	`level_number` int NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`prerequisites_text` text,
	`is_required` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `roadmap_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` varchar(36) NOT NULL,
	`ticket_id` varchar(36) NOT NULL,
	`sender_user_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `support_ticket_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`subject` text NOT NULL,
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`related_course_id` varchar(36),
	`created_at` datetime NOT NULL,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`action` text NOT NULL,
	`target_type` text,
	`target_id` varchar(36),
	`metadata` json,
	`ip_address` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` text NOT NULL,
	`payload` json,
	`read_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` varchar(36) NOT NULL,
	`key` varchar(150) NOT NULL,
	`value` json,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `auth_events` ADD CONSTRAINT `auth_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_modules` ADD CONSTRAINT `course_modules_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_instructor_id_instructors_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instructors` ADD CONSTRAINT `instructors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_video_sources` ADD CONSTRAINT `lesson_video_sources_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_module_id_course_modules_id_fk` FOREIGN KEY (`module_id`) REFERENCES `course_modules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_usage` ADD CONSTRAINT `coupon_usage_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `manual_payment_submissions` ADD CONSTRAINT `manual_payment_submissions_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_verified_by_user_id_users_id_fk` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prices` ADD CONSTRAINT `prices_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_instructor_id_instructors_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_requested_by_user_id_users_id_fk` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_processed_by_user_id_users_id_fk` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_progress` ADD CONSTRAINT `course_progress_last_lesson_id_lessons_id_fk` FOREIGN KEY (`last_lesson_id`) REFERENCES `lessons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_quiz_id_quizzes_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_quiz_id_quizzes_id_fk` FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quizzes` ADD CONSTRAINT `quizzes_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_verifications` ADD CONSTRAINT `certificate_verifications_certificate_id_certificates_id_fk` FOREIGN KEY (`certificate_id`) REFERENCES `certificates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_enrollment_id_enrollments_id_fk` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_instructor_id_instructors_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communities` ADD CONSTRAINT `communities_required_product_id_products_id_fk` FOREIGN KEY (`required_product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_access` ADD CONSTRAINT `community_access_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_access` ADD CONSTRAINT `community_access_community_id_communities_id_fk` FOREIGN KEY (`community_id`) REFERENCES `communities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_class_attendance` ADD CONSTRAINT `live_class_attendance_live_class_id_live_classes_id_fk` FOREIGN KEY (`live_class_id`) REFERENCES `live_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_class_attendance` ADD CONSTRAINT `live_class_attendance_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_classes` ADD CONSTRAINT `live_classes_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `live_classes` ADD CONSTRAINT `live_classes_instructor_id_instructors_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_related_roadmap_stage_id_roadmap_stages_id_fk` FOREIGN KEY (`related_roadmap_stage_id`) REFERENCES `roadmap_stages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_related_course_id_courses_id_fk` FOREIGN KEY (`related_course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmap_stage_resources` ADD CONSTRAINT `roadmap_stage_resources_roadmap_stage_id_roadmap_stages_id_fk` FOREIGN KEY (`roadmap_stage_id`) REFERENCES `roadmap_stages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmap_stage_resources` ADD CONSTRAINT `roadmap_stage_resources_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roadmap_stage_resources` ADD CONSTRAINT `roadmap_stage_resources_resource_id_resources_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `resources`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_messages` ADD CONSTRAINT `support_ticket_messages_ticket_id_support_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_ticket_messages` ADD CONSTRAINT `support_ticket_messages_sender_user_id_users_id_fk` FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_related_course_id_courses_id_fk` FOREIGN KEY (`related_course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;