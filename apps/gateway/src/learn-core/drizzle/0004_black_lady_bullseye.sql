ALTER TABLE `enrollments` DROP FOREIGN KEY `enrollments_course_id_courses_id_fk`;
--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `method` enum('online','manual','free') NOT NULL;--> statement-breakpoint
ALTER TABLE `courses` ADD `learning_outcomes` json;--> statement-breakpoint
ALTER TABLE `courses` ADD `requirements` json;--> statement-breakpoint
ALTER TABLE `courses` ADD `target_audience` text;--> statement-breakpoint
ALTER TABLE `products` ADD `course_id` varchar(36);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_course_id_idx` UNIQUE(`course_id`);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE restrict ON UPDATE no action;