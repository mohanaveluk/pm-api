// Client Master enumerations. Kept together because each is small and they are
// always consumed as a set by the Client DTOs, entities and service.

export enum ClientStatus {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// One REGISTERED office at most; any number of OPERATIONAL offices.
export enum ClientAddressType {
  REGISTERED  = 'REGISTERED',
  OPERATIONAL = 'OPERATIONAL',
}

export enum ClientContactRole {
  PROJECT_MANAGER     = 'PROJECT_MANAGER',
  PROCUREMENT_MANAGER = 'PROCUREMENT_MANAGER',
  ENGINEERING_MANAGER = 'ENGINEERING_MANAGER',
  CONTRACTS_MANAGER   = 'CONTRACTS_MANAGER',
  FINANCE_CONTACT     = 'FINANCE_CONTACT',
  DOCUMENT_CONTROLLER = 'DOCUMENT_CONTROLLER',
  OTHER               = 'OTHER',
}

export enum PreferredContactMethod {
  EMAIL  = 'EMAIL',
  PHONE  = 'PHONE',
  MOBILE = 'MOBILE',
}

export enum ClientDocumentType {
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  TAX_CERTIFICATE       = 'TAX_CERTIFICATE',
  CONTRACT_FRAMEWORK    = 'CONTRACT_FRAMEWORK',
  NDA                   = 'NDA',
  CLIENT_SPECIFICATION  = 'CLIENT_SPECIFICATION',
  DOCUMENT_TEMPLATE     = 'DOCUMENT_TEMPLATE',
  PROCUREMENT_PROCEDURE = 'PROCUREMENT_PROCEDURE',
  OTHER                 = 'OTHER',
}

export enum LegalEntityType {
  CORPORATION               = 'CORPORATION',
  LIMITED_LIABILITY_COMPANY = 'LIMITED_LIABILITY_COMPANY',
  PARTNERSHIP               = 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP       = 'SOLE_PROPRIETORSHIP',
  JOINT_VENTURE             = 'JOINT_VENTURE',
  STATE_OWNED_ENTERPRISE    = 'STATE_OWNED_ENTERPRISE',
  GOVERNMENT_ENTITY         = 'GOVERNMENT_ENTITY',
  NON_PROFIT                = 'NON_PROFIT',
  OTHER                     = 'OTHER',
}

export enum MeasurementSystem {
  METRIC       = 'METRIC',
  IMPERIAL     = 'IMPERIAL',
  US_CUSTOMARY = 'US_CUSTOMARY',
}

// Incoterms 2020.
export enum Incoterm {
  EXW = 'EXW', FCA = 'FCA', CPT = 'CPT', CIP = 'CIP', DAP = 'DAP', DPU = 'DPU',
  DDP = 'DDP', FAS = 'FAS', FOB = 'FOB', CFR = 'CFR', CIF = 'CIF',
}

// What a client change is recorded as in the audit history.
export enum ClientAuditAction {
  CREATED          = 'CREATED',
  UPDATED          = 'UPDATED',
  ACTIVATED        = 'ACTIVATED',
  DEACTIVATED      = 'DEACTIVATED',
  DOCUMENT_ADDED   = 'DOCUMENT_ADDED',
  DOCUMENT_REMOVED = 'DOCUMENT_REMOVED',
  DELETED          = 'DELETED',
}
