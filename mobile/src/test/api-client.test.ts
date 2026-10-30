import { describe, it, expect } from 'vitest';
import { apiClient } from '../api/client';
import { ENV, getApiBaseUrl } from '../constants/env';

describe('OpenAPI Typed Client', () => {
  it('initializes with the configured API base URL', () => {
    expect(getApiBaseUrl()).toBe(ENV.API_URL);
    expect(typeof apiClient.GET).toBe('function');
    expect(typeof apiClient.POST).toBe('function');
  });
});

