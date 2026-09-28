CREATE TABLE `exchange_rates` (
	`id` varchar(36) NOT NULL,
	`currency_code` varchar(3) NOT NULL,
	`rate` decimal(18,6) NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`),
	CONSTRAINT `exchange_rates_currency_code_unique` UNIQUE(`currency_code`)
);
