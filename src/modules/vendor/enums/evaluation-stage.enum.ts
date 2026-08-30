// Stage of the qualification/approval chain that produced an evaluation record.
// Evaluations are append-only, so the full approval trail is reconstructable.
export enum EvaluationStage {
  TECHNICAL   = 'TECHNICAL',
  COMMERCIAL  = 'COMMERCIAL',
  QUALITY_HSE = 'QUALITY_HSE',
  FINANCE     = 'FINANCE',
  PROCUREMENT = 'PROCUREMENT',
  FINAL       = 'FINAL',
}
