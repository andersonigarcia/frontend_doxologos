/**
 * Common type definitions used across the application
 */

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  error: string | null;
  success: boolean;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  order: SortOrder;
}

/**
 * Filter operator
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'in'
  | 'nin';

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Loading state
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Async state with data
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Form field state
 */
export interface FormFieldState {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

/**
 * Generic form state
 */
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * Option type for selects/dropdowns
 */
export interface Option<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
}

/**
 * Toast notification type
 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * Modal state
 */
export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
  onClose?: () => void;
  onConfirm?: () => void;
}

/**
 * Theme type
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * App configuration
 */
export interface AppConfig {
  appName: string;
  version: string;
  apiTimeout: number;
  maxRetries: number;
  theme: Theme;
  locale: string;
}
