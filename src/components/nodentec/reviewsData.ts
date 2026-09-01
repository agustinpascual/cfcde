export const RATING = "4,9";
export const RATING_BREAKDOWN: [number, number][] = [[5, 3423], [4, 1141], [3, 0], [2, 0], [1, 0]];
export const TOTAL_REVIEWS = RATING_BREAKDOWN.reduce((sum, [, count]) => sum + count, 0);
