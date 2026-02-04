/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/external-resources/route';

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

describe('External Resources API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockReturnThis();
    mockSupabaseClient.insert.mockReturnThis();
    mockSupabaseClient.eq.mockReturnThis();
    mockSupabaseClient.order.mockReturnThis();
  });

  describe('GET /api/external-resources', () => {
    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns list of external resources', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockSupabaseClient.order.mockResolvedValueOnce({
        data: [
          { id: 'r1', user_id: 'user-123', title: 'Google', url: 'https://google.com', icon: '🔍', click_count: 5, created_at: '2025-01-01', updated_at: '2025-01-01' },
        ],
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.resources).toHaveLength(1);
      expect(data.resources[0].title).toBe('Google');
      expect(data.resources[0].clickCount).toBe(5);
    });
  });

  describe('POST /api/external-resources', () => {
    it('returns 401 if not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const request = new Request('http://localhost/api/external-resources', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', url: 'https://test.com' }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 400 if title is missing', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      const request = new Request('http://localhost/api/external-resources', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://test.com' }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 400 if url is invalid', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      const request = new Request('http://localhost/api/external-resources', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', url: 'not-a-url' }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('creates external resource successfully', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-123' } });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'r1', user_id: 'user-123', title: 'Test', url: 'https://test.com', icon: '🔗', click_count: 0, created_at: '2025-01-01', updated_at: '2025-01-01' },
        error: null,
      });

      const request = new Request('http://localhost/api/external-resources', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', url: 'https://test.com' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.resource.title).toBe('Test');
      expect(data.resource.icon).toBe('🔗');
    });
  });
});
