/**
 * Checks if a value is numeric (can be converted to a finite number).
 * Handles both numbers and string representations of numbers.
 */
export function isNumeric(value: any): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    // Try converting to a number and check if it's finite
    const num = Number(value);
    return Number.isFinite(num);
  }
  return false;
} 