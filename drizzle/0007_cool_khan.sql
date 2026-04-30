CREATE TABLE `soar_telemetry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playbook` varchar(128) NOT NULL,
	`actionTaken` varchar(256) NOT NULL,
	`executionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `soar_telemetry_id` PRIMARY KEY(`id`)
);
