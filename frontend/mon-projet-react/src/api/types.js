/**
 * Shared API types for the ACR frontend.
 *
 * Each response from the backend is wrapped as:
 * {
 *   success: true,
 *   data: <payload>,
 *   meta: { lang, ... }
 * }
 *
 * Errors are thrown as ApiError with:
 * {
 *   code, message, details, status
 * }
 */
export {};
