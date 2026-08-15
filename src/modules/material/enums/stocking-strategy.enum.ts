export enum StockingStrategy {
  MAKE_TO_STOCK   = 'MAKE_TO_STOCK',   // maintain buffer stock; replenish on reorder point
  MAKE_TO_ORDER   = 'MAKE_TO_ORDER',   // procure only when project/PR demand exists
  CONSIGNMENT     = 'CONSIGNMENT',     // vendor-owned stock stored at site
  NO_STOCK        = 'NO_STOCK',        // direct-charge items; never warehoused
}
