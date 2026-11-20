-- Request for Quotation — production schema changes (dev uses TypeORM synchronize).
-- Run once, in this order. Tables reference organizations, projects, clients, vendors and the material requisition tables.

ALTER TABLE workflow_events MODIFY COLUMN action ENUM('CREATED','UPDATED','SUBMITTED','RESUBMITTED','EDITED_IN_REVIEW','EDITED_IN_APPROVAL','REVIEWED','REVIEW_COMPLETED','APPROVED','APPROVAL_COMPLETED','RETURNED','REJECTED','CANCELLED','REQUESTED','DELETED','ASSIGNED','UNASSIGNED','ISSUED','QUOTED','STATUS_CHANGED','LOCKED','NOTIFIED') NOT NULL;

CREATE TABLE `rfqs` (
  `id` varchar(36) NOT NULL,
  `dguid` varchar(255) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `code` varchar(20) NOT NULL,
  `rfqNumber` varchar(50) NOT NULL,
  `revisionNo` int NOT NULL DEFAULT '0',
  `issueDate` date DEFAULT NULL,
  `projectId` varchar(36) NOT NULL,
  `clientId` varchar(36) DEFAULT NULL,
  `contactName` varchar(255) DEFAULT NULL,
  `contactEmail` varchar(255) DEFAULT NULL,
  `contactPhone` varchar(50) DEFAULT NULL,
  `bidClosingDate` date DEFAULT NULL,
  `sealedBid` tinyint NOT NULL DEFAULT '0',
  `ndaScope` enum('TECHNICAL','COMMERCIAL','TECHNICAL_AND_COMMERCIAL') DEFAULT NULL,
  `vendorId` varchar(36) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `content` text,
  `instructionsToBidders` text,
  `scopeDescription` text,
  `scopeQuantityNotes` text,
  `deliveryLocation` text,
  `deliverySchedule` text,
  `materialGradeStandards` text,
  `designConditions` text,
  `dimensionalRequirements` text,
  `applicableCodes` text,
  `qualityRequirements` text,
  `regulatoryCompliance` text,
  `inspectionTesting` text,
  `documentationRequirements` text,
  `pricingFormat` text,
  `incoterms` text,
  `paymentTerms` text,
  `taxesDuties` text,
  `warranty` text,
  `liquidatedDamages` text,
  `performanceGuarantee` text,
  `insuranceRequirements` text,
  `packingMarking` text,
  `commercialDocumentation` text,
  `quotedCurrency` varchar(3) DEFAULT NULL,
  `quotedAt` datetime DEFAULT NULL,
  `quotedBy` varchar(255) DEFAULT NULL,
  `status` enum('DRAFT','ISSUED','ACKNOWLEDGED','QUOTED','COMPLETED','APPROVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `issuedAt` datetime DEFAULT NULL,
  `issuedBy` varchar(255) DEFAULT NULL,
  `trackingId` varchar(30) DEFAULT NULL,
  `is_deleted` tinyint NOT NULL DEFAULT '0',
  `deletedAt` datetime DEFAULT NULL,
  `deletedBy` varchar(255) DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `updatedBy` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_da16d562a821866a2568c62353` (`dguid`),
  UNIQUE KEY `UQ_rfq_org_number_rev` (`organizationId`,`rfqNumber`,`revisionNo`),
  UNIQUE KEY `UQ_rfq_org_code` (`organizationId`,`code`),
  KEY `IDX_rfq_org_project` (`organizationId`,`projectId`),
  KEY `IDX_rfq_org_vendor` (`organizationId`,`vendorId`),
  KEY `IDX_rfq_org_status` (`organizationId`,`status`),
  KEY `FK_dc8cf50e8ff08fe21a3ecc6eb10` (`projectId`),
  KEY `FK_5bf2c05d41c547d1e0bfd32e892` (`clientId`),
  KEY `FK_1a85128503116a5e60a5dca53a9` (`vendorId`),
  CONSTRAINT `FK_1a85128503116a5e60a5dca53a9` FOREIGN KEY (`vendorId`) REFERENCES `vendors` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_5bf2c05d41c547d1e0bfd32e892` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_78dcb00a73c8db9324ed0d592d6` FOREIGN KEY (`organizationId`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_dc8cf50e8ff08fe21a3ecc6eb10` FOREIGN KEY (`projectId`) REFERENCES `project_masters` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_requisitions` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `requisitionId` varchar(36) NOT NULL,
  `mrNumber` varchar(50) NOT NULL,
  `sequence` int NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_rfqr_rfq_requisition` (`rfqId`,`requisitionId`),
  KEY `IDX_rfqr_requisition` (`requisitionId`),
  CONSTRAINT `FK_86219c4a732e34a669dad6c0f41` FOREIGN KEY (`requisitionId`) REFERENCES `material_requisitions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_b545b062ba19719c9d36d822692` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_items` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `lineNumber` int NOT NULL,
  `requisitionId` varchar(36) NOT NULL,
  `mrNumber` varchar(50) NOT NULL,
  `requisitionItemId` varchar(36) NOT NULL,
  `materialId` varchar(36) NOT NULL,
  `itemCode` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `uom` varchar(50) DEFAULT NULL,
  `mrQuantity` decimal(18,3) NOT NULL,
  `rfqQuantity` decimal(18,3) NOT NULL,
  `unitPrice` decimal(18,4) DEFAULT NULL,
  `totalPrice` decimal(18,4) DEFAULT NULL,
  `exchangeRate` decimal(18,6) DEFAULT NULL,
  `totalPriceUsd` decimal(18,4) DEFAULT NULL,
  `deliveryDuration` varchar(100) DEFAULT NULL,
  `remarks` text,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_rfqi_requisition_item` (`requisitionItemId`),
  KEY `IDX_rfqi_rfq` (`rfqId`,`lineNumber`),
  CONSTRAINT `FK_be706469f1921b7489305adf352` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_documents` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `section` enum('TERMS_AND_CONDITIONS','NON_DISCLOSURE_AGREEMENT','INSTRUCTIONS_TO_BIDDERS','SCOPE_ASSOCIATED','TECHNICAL_SPECIFICATION','DRAWING_DATASHEET','VENDOR_QUALIFICATION') NOT NULL,
  `documentName` varchar(255) NOT NULL,
  `documentUrl` varchar(1000) NOT NULL,
  `fileName` varchar(255) DEFAULT NULL,
  `mimeType` varchar(100) DEFAULT NULL,
  `fileSizeBytes` bigint DEFAULT NULL,
  `sourceRequisitionId` varchar(36) DEFAULT NULL,
  `sourceDocumentId` varchar(36) DEFAULT NULL,
  `sourceMrNumber` varchar(50) DEFAULT NULL,
  `vendorDocumentId` varchar(36) DEFAULT NULL,
  `uploadedBy` varchar(255) DEFAULT NULL,
  `uploadedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_rfqd_rfq_section` (`rfqId`,`section`),
  CONSTRAINT `FK_2a02d654fb4305fdb90b66d1611` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_other_charges` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `sequence` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_rfqoc_rfq` (`rfqId`,`sequence`),
  CONSTRAINT `FK_ce2d066adfa7cbf2ae622f7927a` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_checklist_items` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `section` enum('TECHNICAL','COMMERCIAL') NOT NULL,
  `key` varchar(50) NOT NULL,
  `label` varchar(255) NOT NULL,
  `sequence` int NOT NULL,
  `provided` tinyint DEFAULT NULL,
  `reason` text,
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_rfqcl_rfq_key` (`rfqId`,`key`),
  CONSTRAINT `FK_a0c84d34a1f4c3726eac629465b` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_compliances` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `sequence` int NOT NULL,
  `sourceComplianceId` varchar(36) DEFAULT NULL,
  `sourceRequisitionId` varchar(36) DEFAULT NULL,
  `sourceMrNumber` varchar(50) DEFAULT NULL,
  `requirement` text NOT NULL,
  `vendorResponse` text,
  `compliant` tinyint DEFAULT NULL,
  `remarks` text,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_rfqc_source` (`sourceComplianceId`),
  KEY `IDX_rfqc_rfq` (`rfqId`,`sequence`),
  CONSTRAINT `FK_77331fe3953662b7989a63f09bf` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_e1637eee11c1ea42a4e709d5c9b` FOREIGN KEY (`sourceComplianceId`) REFERENCES `material_requisition_compliances` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `rfq_deviations` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `sequence` int NOT NULL,
  `sourceDeviationId` varchar(36) DEFAULT NULL,
  `clauseNo` varchar(50) NOT NULL,
  `rfqRequirement` text NOT NULL,
  `vendorDeviation` tinyint NOT NULL DEFAULT '0',
  `justification` text,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_rfqdv_rfq` (`rfqId`,`sequence`),
  CONSTRAINT `FK_1552c2705dc7edd9717b5e9f165` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ── RFQ Acknowledgement Form & vendor response (added later) ─────────────────
ALTER TABLE rfqs MODIFY COLUMN status ENUM('DRAFT','ISSUED','ACKNOWLEDGED','DECLINED','QUOTED','COMPLETED','APPROVED','CANCELLED') NOT NULL DEFAULT 'DRAFT';

ALTER TABLE rfq_documents MODIFY COLUMN section ENUM('TERMS_AND_CONDITIONS','NON_DISCLOSURE_AGREEMENT','INSTRUCTIONS_TO_BIDDERS','SCOPE_ASSOCIATED','TECHNICAL_SPECIFICATION','DRAWING_DATASHEET','VENDOR_QUALIFICATION','ACKNOWLEDGEMENT') NOT NULL;

ALTER TABLE workflow_events MODIFY COLUMN action ENUM('CREATED','UPDATED','SUBMITTED','RESUBMITTED','EDITED_IN_REVIEW','EDITED_IN_APPROVAL','REVIEWED','REVIEW_COMPLETED','APPROVED','APPROVAL_COMPLETED','RETURNED','REJECTED','CANCELLED','REQUESTED','DELETED','ASSIGNED','UNASSIGNED','ISSUED','ACKNOWLEDGED','DECLINED','QUOTED','STATUS_CHANGED','LOCKED','NOTIFIED') NOT NULL;

CREATE TABLE `rfq_acknowledgements` (
  `id` varchar(36) NOT NULL,
  `organizationId` varchar(255) NOT NULL,
  `rfqId` varchar(255) NOT NULL,
  `participate` tinyint NOT NULL,
  `willSubmitQuotation` tinyint NOT NULL,
  `vendorName` varchar(200) NOT NULL,
  `contactPerson` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `acknowledgedBy` varchar(150) NOT NULL,
  `acknowledgedAt` datetime NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_rfqack_rfq` (`rfqId`),
  UNIQUE KEY `REL_bc816d93e75f26fc6df08a373a` (`rfqId`),
  CONSTRAINT `FK_bc816d93e75f26fc6df08a373ad` FOREIGN KEY (`rfqId`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
