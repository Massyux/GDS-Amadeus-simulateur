export function createSimAvailabilityProvider({ buildOfflineAvailability }) {
  return {
    searchAvailability: ({ from, to, ddmmm, dow }) =>
      buildOfflineAvailability({ from, to, ddmmm, dow }),
  };
}
