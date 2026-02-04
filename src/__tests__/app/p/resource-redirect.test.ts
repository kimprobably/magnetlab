/**
 * @jest-environment node
 */

import { GET } from '@/app/p/[username]/[slug]/r/[resourceId]/route';

// Mock Supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/lib/utils/supabase-server', () => ({
  createSupabaseAdminClient: () => ({
    from: mockFrom,
  }),
}));

describe('GET /p/[username]/[slug]/r/[resourceId]', () => {
  const validResourceId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '660e8400-e29b-41d4-a716-446655440001';
  const validFunnelId = '770e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock chain
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: { id: validUserId },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'funnel_pages') {
        return {
          select: mockSelect.mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: mockSingle.mockResolvedValue({
                    data: { id: validFunnelId, library_id: null },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'external_resources') {
        return {
          select: mockSelect.mockReturnValue({
            eq: mockEq.mockReturnValue({
              single: mockSingle.mockResolvedValue({
                data: {
                  id: validResourceId,
                  url: 'https://example.com/resource',
                  user_id: validUserId,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'external_resource_clicks') {
        return {
          insert: mockInsert.mockReturnValue({
            then: jest.fn(),
          }),
        };
      }
      return {};
    });
  });

  it('redirects to home for invalid resourceId', async () => {
    const request = new Request('http://localhost/p/testuser/testslug/r/invalid-id');
    const params = Promise.resolve({
      username: 'testuser',
      slug: 'testslug',
      resourceId: 'invalid-id',
    });

    const response = await GET(request, { params });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('redirects to home when user not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const request = new Request(`http://localhost/p/testuser/testslug/r/${validResourceId}`);
    const params = Promise.resolve({
      username: 'testuser',
      slug: 'testslug',
      resourceId: validResourceId,
    });

    const response = await GET(request, { params });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
  });
});
