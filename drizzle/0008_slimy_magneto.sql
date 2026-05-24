CREATE TABLE `copilot_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`userId` int,
	`userName` varchar(256),
	`userRole` varchar(32),
	`messages` text NOT NULL,
	`snapshotSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copilot_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `copilot_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `emulation_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`techniqueId` varchar(64),
	`status` enum('planned','executed','detected','missed') NOT NULL DEFAULT 'planned',
	`notes` text,
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emulation_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pentest_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(256) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','resolved','accepted_risk') NOT NULL DEFAULT 'open',
	`description` text,
	`remediation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pentest_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target` varchar(256) NOT NULL,
	`scannerType` enum('nmap','zap','openvas','custom','full_suite') NOT NULL DEFAULT 'nmap',
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`resultSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `security_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `soar_telemetry` ADD `details` text;