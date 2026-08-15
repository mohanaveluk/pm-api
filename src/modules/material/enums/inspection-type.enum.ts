export enum InspectionType {
  INCOMING   = 'INCOMING',    // inspection on goods receipt at warehouse
  IN_PROCESS = 'IN_PROCESS',  // inspection during manufacturing / installation
  FINAL      = 'FINAL',       // final acceptance inspection before delivery
  NONE       = 'NONE',        // no inspection required
}
