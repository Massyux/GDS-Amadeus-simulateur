export function createSimPricingProvider({ buildPricingData }) {
  return {
    price: ({ pnr, mode, segmentsOverride, clock }) =>
      buildPricingData(pnr, mode, segmentsOverride, clock),
  };
}
