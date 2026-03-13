/**
 * Safely extract an error message from an unknown thrown value.
 * Handles: plain strings, Error instances, axios errors (response.data.message),
 * and objects with a message property.
 */
export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    // Axios-style errors: error.response.data.message
    const response = err.response as Record<string, unknown> | undefined;
    const data = response?.data as Record<string, unknown> | undefined;
    if (typeof data?.message === 'string') return data.message;
    // Plain {message: string} objects (e.g. Redux thunk rejections)
    if (typeof err.message === 'string') return err.message;
  }
  return fallback;
}
