export function createSimPricingProvider({ buildPricingData }) {
  return {
    price: ({ pnr, mode, segmentsOverride }) =>
      buildPricingData(pnr, mode, segmentsOverride),
  };
}
