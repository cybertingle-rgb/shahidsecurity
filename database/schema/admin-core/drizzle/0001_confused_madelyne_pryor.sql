ALTER TABLE `consultations` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `consultations` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `consultations` ADD `country` varchar(100);