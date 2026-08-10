// UOM Type groups units into measurement families.
// Used for filtering dropdowns (e.g. "show only WEIGHT units") and
// future unit-conversion logic within the Material Master module.

export enum UomType {
  WEIGHT      = 'WEIGHT',      // KG, G, TON, LB, OZ
  VOLUME      = 'VOLUME',      // LTR, ML, M3, GAL, BBL
  LENGTH      = 'LENGTH',      // METER, CM, MM, KM, INCH, FOOT, YARD
  AREA        = 'AREA',        // M2, CM2, SQFT, SQIN, ACRE
  EACH        = 'EACH',        // EA, PC, SET, PAIR, DOZEN, GROSS
  TIME        = 'TIME',        // HR, MIN, SEC, DAY, WEEK, MONTH, YEAR
  TEMPERATURE = 'TEMPERATURE', // DEG_C, DEG_F, KELVIN
  PRESSURE    = 'PRESSURE',    // BAR, PSI, KPA, MPA
  POWER       = 'POWER',       // KW, MW, HP
  ENERGY      = 'ENERGY',      // KWH, KCAL, BTU
  OTHER       = 'OTHER',       // Catch-all for non-standard units
}
