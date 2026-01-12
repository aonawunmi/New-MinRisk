/**
 * API Response Types
 * 
 * Generic response types for API operations
 */

export interface ApiResponse<T> {
    data: T | null;
    error: Error | null;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: unknown;
}

export interface PaginatedResponse<T> {
    data: T[] | null;
    error: Error | null;
    total?: number;
    page?: number;
    pageSize?: number;
}

export type Result<T> =
    | { success: true; data: T }
    | { success: false; error: Error };
