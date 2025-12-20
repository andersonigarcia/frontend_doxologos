import { renderHook } from '@testing-library/react';
import { usePermissions } from '../usePermissions';

// Mock do useAuth
const mockUseAuth = jest.fn();
jest.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

describe('usePermissions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('User role permissions', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123' },
                userRole: 'user',
            });
        });

        test('should allow user to create booking', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('booking:create')).toBe(true);
        });

        test('should allow user to view own bookings', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('booking:view_own')).toBe(true);
        });

        test('should not allow user to view all bookings', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('booking:view_all')).toBe(false);
        });

        test('should verify user role correctly', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.hasRole('user')).toBe(true);
            expect(result.current.hasRole('admin')).toBe(false);
        });
    });

    describe('Professional role permissions', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: { id: 'prof-123' },
                userRole: 'professional',
            });
        });

        test('should allow professional to manage assigned bookings', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('booking:manage_assigned')).toBe(true);
        });

        test('should allow professional to manage own availability', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('availability:manage_own')).toBe(true);
        });

        test('should allow professional to view professional dashboard', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('dashboard:view_professional')).toBe(true);
        });

        test('should not allow professional to manage all bookings', () => {
            const { result } = renderHook(() => usePermissions());
            expect(result.current.can('booking:manage_all')).toBe(false);
        });
    });

    describe('Admin role permissions', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: { id: 'admin-123' },
                userRole: 'admin',
            });
        });

        test('should allow admin to do everything', () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.can('booking:view_all')).toBe(true);
            expect(result.current.can('booking:manage_all')).toBe(true);
            expect(result.current.can('user:manage_all')).toBe(true);
            expect(result.current.can('system:configure')).toBe(true);
            expect(result.current.can('any:random:permission')).toBe(true);
        });
    });

    describe('Ownership checks', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123' },
                userRole: 'user',
            });
        });

        test('should verify ownership correctly', () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.isOwner('user-123')).toBe(true);
            expect(result.current.isOwner('other-user')).toBe(false);
        });

        test('should check permission with ownership', () => {
            const { result } = renderHook(() => usePermissions());

            expect(
                result.current.can('booking:cancel_own', {
                    resourceOwnerId: 'user-123',
                })
            ).toBe(true);

            expect(
                result.current.can('booking:cancel_own', {
                    resourceOwnerId: 'other-user',
                })
            ).toBe(false);
        });
    });

    describe('Multiple permission checks', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: { id: 'user-123' },
                userRole: 'user',
            });
        });

        test('should check if user has any of the permissions', () => {
            const { result } = renderHook(() => usePermissions());

            expect(
                result.current.canAny(['booking:create', 'booking:view_all'])
            ).toBe(true);

            expect(
                result.current.canAny(['booking:view_all', 'user:manage_all'])
            ).toBe(false);
        });

        test('should check if user has all permissions', () => {
            const { result } = renderHook(() => usePermissions());

            expect(
                result.current.canAll(['booking:create', 'booking:view_own'])
            ).toBe(true);

            expect(
                result.current.canAll(['booking:create', 'booking:view_all'])
            ).toBe(false);
        });
    });

    describe('Unauthenticated user', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: null,
                userRole: null,
            });
        });

        test('should deny all permissions for unauthenticated user', () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.can('booking:create')).toBe(false);
            expect(result.current.hasRole('user')).toBe(false);
            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('Role verification with arrays', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: { id: 'prof-123' },
                userRole: 'professional',
            });
        });

        test('should check if user has any of the roles', () => {
            const { result } = renderHook(() => usePermissions());

            expect(result.current.hasRole(['user', 'professional'])).toBe(true);
            expect(result.current.hasRole(['user', 'admin'])).toBe(false);
        });
    });
});
