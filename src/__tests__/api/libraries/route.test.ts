/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/libraries/route';

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock('@/lib/utils/supabase-server', () => ({
  createSupabaseAdminClient: jest.fn(() => mockSupabaseClient),
}));

const mockAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

describe('Libraries API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.insert.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.order.mockReturnThis();
  });

  describe('GET /api/libraries', () => {
    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns list of libraries', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockSupabaseClient.order.mockResolvedValueOnce({
        data: [
          { id: 'lib1', user_id: 'user-123', name: 'My Library', description: null, icon: '📚', slug: 'my-library', auto_feature_days: 14, created_at: '2025-01-01', updated_at: '2025-01-01' },
        ],
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.libraries).toHaveLength(1);
      expect(data.libraries[0].name).toBe('My Library');
      expect(data.libraries[0].autoFeatureDays).toBe(14);
    });
  });

  describe('POST /api/libraries', () => {
    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const request = new Request('http://localhost/api/libraries', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Library' }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 if name is missing', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      const request = new Request('http://localhost/api/libraries', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('creates library with auto-generated slug', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      // First call checks if slug exists - returns null (no collision)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
      // Second call is the insert
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'lib1', user_id: 'user-123', name: 'My Test Library', description: null, icon: '📚', slug: 'my-test-library', auto_feature_days: 14, created_at: '2025-01-01', updated_at: '2025-01-01' },
        error: null,
      });

      const request = new Request('http://localhost/api/libraries', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Test Library' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.library.name).toBe('My Test Library');
      expect(data.library.slug).toBe('my-test-library');
    });
  });
});
