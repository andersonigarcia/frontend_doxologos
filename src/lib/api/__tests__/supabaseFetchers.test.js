import { fetchAvailabilityMap } from '../supabaseFetchers';
import { supabase } from '@/lib/customSupabaseClient';

// Mock the supabase client
jest.mock('@/lib/customSupabaseClient', () => ({
    supabase: {
        from: jest.fn(),
    },
}));

describe('fetchAvailabilityMap', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should fetch availability and organize by professional and day', async () => {
        const mockData = [
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['09:00', '10:00', '11:00'],
                month: 1,
                year: 2026,
            },
            {
                professional_id: 'prof-1',
                day_of_week: 'tuesday',
                available_times: ['14:00', '15:00'],
                month: 1,
                year: 2026,
            },
            {
                professional_id: 'prof-2',
                day_of_week: 'monday',
                available_times: ['10:00', '11:00'],
                month: 1,
                year: 2026,
            },
        ];

        const selectMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap();

        expect(fromMock).toHaveBeenCalledWith('availability');
        expect(selectMock).toHaveBeenCalledWith('*');
        expect(result).toEqual({
            'prof-1': {
                monday: {
                    times: ['09:00', '10:00', '11:00'],
                    month: 1,
                    year: 2026,
                },
                tuesday: {
                    times: ['14:00', '15:00'],
                    month: 1,
                    year: 2026,
                },
            },
            'prof-2': {
                monday: {
                    times: ['10:00', '11:00'],
                    month: 1,
                    year: 2026,
                },
            },
        });
    });

    it('should filter by current month/year when no parameters provided', async () => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const mockData = [
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['09:00'],
                month: currentMonth,
                year: currentYear,
            },
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['14:00'], // Different month - should be excluded
                month: currentMonth === 12 ? 1 : currentMonth + 1,
                year: currentMonth === 12 ? currentYear + 1 : currentYear,
            },
        ];

        const selectMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap();

        // Should only include current month's availability
        expect(result['prof-1'].monday.times).toEqual(['09:00']);
        expect(result['prof-1'].monday.month).toBe(currentMonth);
        expect(result['prof-1'].monday.year).toBe(currentYear);
    });

    it('should filter by specified month and year', async () => {
        const mockData = [
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['09:00'],
                month: 2,
                year: 2026,
            },
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['14:00'],
                month: 3,
                year: 2026,
            },
        ];

        const selectMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap({ month: 2, year: 2026 });

        expect(result['prof-1'].monday.times).toEqual(['09:00']);
        expect(result['prof-1'].monday.month).toBe(2);
    });

    it('should handle multiple months when includeNextMonths is true', async () => {
        const mockData = [
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['09:00'],
                month: 1,
                year: 2026,
            },
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['14:00'],
                month: 2,
                year: 2026,
            },
        ];

        const selectMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap({
            month: 1,
            year: 2026,
            includeNextMonths: 2
        });

        // Should include both months
        expect(result['prof-1'].monday).toHaveLength(2);
        expect(result['prof-1'].monday[0].times).toEqual(['09:00']);
        expect(result['prof-1'].monday[1].times).toEqual(['14:00']);
    });

    it('should handle empty data gracefully', async () => {
        const selectMock = jest.fn().mockResolvedValue({ data: [], error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap();

        expect(result).toEqual({});
    });

    it('should handle null data gracefully', async () => {
        const selectMock = jest.fn().mockResolvedValue({ data: null, error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap();

        expect(result).toEqual({});
    });

    it('should throw error when database query fails', async () => {
        const mockError = new Error('Database connection failed');
        const selectMock = jest.fn().mockResolvedValue({ data: null, error: mockError });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        await expect(fetchAvailabilityMap()).rejects.toThrow('Database connection failed');
    });

    it('should handle year transition correctly', async () => {
        const mockData = [
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['09:00'],
                month: 12,
                year: 2025,
            },
            {
                professional_id: 'prof-1',
                day_of_week: 'monday',
                available_times: ['14:00'],
                month: 1,
                year: 2026,
            },
        ];

        const selectMock = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const fromMock = jest.fn().mockReturnValue({ select: selectMock });
        supabase.from = fromMock;

        const result = await fetchAvailabilityMap({ month: 1, year: 2026 });

        expect(result['prof-1'].monday.times).toEqual(['14:00']);
        expect(result['prof-1'].monday.year).toBe(2026);
    });
});
