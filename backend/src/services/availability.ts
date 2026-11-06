export type StockVisibility = "EXACT" | "LEVEL";
export type AvailabilityLevel = "high" | "low" | "none";

export function periodsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
): boolean {
  return firstStart < secondEnd && firstEnd > secondStart;
}

export function calculateAvailability(input: {
  stock: number;
  occupiedUnits: number;
  blocked: boolean;
  visibility: StockVisibility;
  lowStockThreshold: number;
}): {
  available: boolean;
  remainingUnits?: number;
  availabilityLevel?: AvailabilityLevel;
} {
  const remainingUnits = input.blocked
    ? 0
    : Math.max(0, input.stock - input.occupiedUnits);
  const available = !input.blocked && remainingUnits > 0;
  if (input.visibility === "EXACT") {
    return { available, remainingUnits };
  }
  const availabilityLevel: AvailabilityLevel = remainingUnits === 0
    ? "none"
    : remainingUnits <= input.lowStockThreshold ? "low" : "high";
  return { available, availabilityLevel };
}
