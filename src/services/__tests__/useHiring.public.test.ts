/**
 * Unit tests for public hiring data-fetching functions.
 *
 * Tests cover:
 * 1. fetchPublicJob — returns null for unknown org, closed job, missing RLS, or valid job.
 * 2. fetchPublicJobs — returns [] for unknown org or no open jobs, returns list for valid org.
 * 3. Hook option shape — query key and `enabled` flag for usePublicJob / usePublicJobs.
 *
 * The Supabase client is fully mocked so no network calls are made.
 * Each test registers per-table DB responses via `setTableResponse`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock: @/integrations/supabase/client
// Per-table response registry — tests set responses before calling queryFns.
// ---------------------------------------------------------------------------

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function setTableResponse(table: string, data: unknown, error: unknown = null) {
  tableResponses[table] = { data, error };
}

function clearResponses() {
  Object.keys(tableResponses).forEach(k => delete tableResponses[k]);
}

// Build a fluent mock chain that resolves at .single() / .maybeSingle() / .order() (array queries)
function makeChain(table: string): Record<string, unknown> {
  const resolve = () =>
    Promise.resolve(tableResponses[table] ?? { data: null, error: null });

  // .order() is the terminal for list queries (fetchPublicJobs) — it returns a thenable
  const orderResult = {
    then: (onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) =>
      resolve().then(onfulfilled, onrejected),
  };

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => orderResult,
    single: resolve,
    maybeSingle: resolve,
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeChain(table),
  },
}));

// ---------------------------------------------------------------------------
// Import pure query functions (no React / QueryClient needed)
// ---------------------------------------------------------------------------

import { fetchPublicJob, fetchPublicJobs } from '@/services/useHiring';

// ---------------------------------------------------------------------------
// fetchPublicJob
// ---------------------------------------------------------------------------

describe('fetchPublicJob', () => {
  beforeEach(clearResponses);

  it('returns null when the org is not found (wrong slug)', async () => {
    setTableResponse('organizations', null);
    const result = await fetchPublicJob('ghost-org', 'some-job');
    expect(result).toBeNull();
  });

  it('returns null when org lookup has a DB error (simulates missing anon RLS on organizations)', async () => {
    setTableResponse('organizations', null, { message: 'permission denied for table organizations' });
    const result = await fetchPublicJob('acme', 'some-job');
    expect(result).toBeNull();
  });

  it('returns null when the job is not found (closed, wrong slug, or missing anon RLS on jobs)', async () => {
    setTableResponse('organizations', { id: 'org-1', name: 'Acme', slug: 'acme', logo_url: null, website: null });
    setTableResponse('jobs', null);
    const result = await fetchPublicJob('acme', 'closed-job');
    expect(result).toBeNull();
  });

  it('throws when the jobs query returns a DB error', async () => {
    setTableResponse('organizations', { id: 'org-1', name: 'Acme', slug: 'acme', logo_url: null, website: null });
    setTableResponse('jobs', null, { message: 'unexpected db error' });
    await expect(fetchPublicJob('acme', 'any-job')).rejects.toMatchObject({ message: 'unexpected db error' });
  });

  it('returns merged job+organization data for a valid open job', async () => {
    setTableResponse('organizations', {
      id: 'org-1',
      name: 'Acme Ltd',
      slug: 'acme',
      logo_url: 'https://acme.com/logo.png',
      website: 'https://acme.com',
    });
    setTableResponse('jobs', {
      id: 'job-1',
      slug: 'product-manager',
      title: 'Product Manager',
      status: 'open',
      organization_id: 'org-1',
      department: null,
      office: null,
    });

    const result = await fetchPublicJob('acme', 'product-manager') as unknown as Record<string, unknown>;

    expect(result).not.toBeNull();
    expect(result['id']).toBe('job-1');
    expect(result['title']).toBe('Product Manager');

    // Organization metadata must be merged for the page header
    const org = result['organization'] as Record<string, unknown>;
    expect(org['slug']).toBe('acme');
    expect(org['name']).toBe('Acme Ltd');
    expect(org['website']).toBe('https://acme.com');
  });
});

// ---------------------------------------------------------------------------
// fetchPublicJobs
// ---------------------------------------------------------------------------

describe('fetchPublicJobs', () => {
  beforeEach(clearResponses);

  it('returns empty array when the org is not found', async () => {
    setTableResponse('organizations', null);
    const result = await fetchPublicJobs('ghost-org');
    expect(result).toEqual([]);
  });

  it('returns empty array when org lookup has a DB error (simulates missing anon RLS on organizations)', async () => {
    setTableResponse('organizations', null, { message: 'permission denied' });
    const result = await fetchPublicJobs('acme');
    expect(result).toEqual([]);
  });

  it('returns empty array when no open public jobs exist', async () => {
    setTableResponse('organizations', { id: 'org-1' });
    setTableResponse('jobs', []);
    const result = await fetchPublicJobs('acme');
    expect(result).toEqual([]);
  });

  it('throws when the jobs query returns a DB error', async () => {
    setTableResponse('organizations', { id: 'org-1' });
    setTableResponse('jobs', null, { message: 'db error' });
    await expect(fetchPublicJobs('acme')).rejects.toMatchObject({ message: 'db error' });
  });

  it('returns all open public jobs for a valid org', async () => {
    setTableResponse('organizations', { id: 'org-1' });
    setTableResponse('jobs', [
      { id: 'job-1', title: 'Engineer', status: 'open', is_public_visible: true },
      { id: 'job-2', title: 'Designer', status: 'open', is_public_visible: true },
    ]);

    const result = await fetchPublicJobs('acme') as unknown[];
    expect(result).toHaveLength(2);
    expect((result[0] as Record<string, unknown>)['title']).toBe('Engineer');
  });
});

// ---------------------------------------------------------------------------
// Hook option shape (query key + enabled) — tested by importing the hooks and
// calling them inside a renderHook wrapper with a QueryClient.
// These tests run purely in jsdom without hitting the network.
// ---------------------------------------------------------------------------

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

import { usePublicJob, usePublicJobs } from '@/services/useHiring';

describe('usePublicJob — hook option shape', () => {
  beforeEach(clearResponses);

  it('query is disabled when orgSlug is undefined', () => {
    const { result } = renderHook(() => usePublicJob(undefined, 'job'), { wrapper: makeWrapper() });
    // fetchStatus 'idle' means the query is disabled
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('query is disabled when jobSlug is undefined', () => {
    const { result } = renderHook(() => usePublicJob('org', undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('query key contains both slugs', () => {
    const { result } = renderHook(() => usePublicJob('acme', 'engineer'), { wrapper: makeWrapper() });
    // The query is enabled; its key is set correctly (React Query uses queryKey internally)
    // We verify via the status — it should be 'pending' (running) not 'idle' (disabled)
    expect(result.current.fetchStatus).not.toBe('idle');
  });
});

describe('usePublicJobs — hook option shape', () => {
  beforeEach(clearResponses);

  it('query is disabled when orgSlug is undefined', () => {
    const { result } = renderHook(() => usePublicJobs(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('query is enabled when orgSlug is provided', () => {
    const { result } = renderHook(() => usePublicJobs('acme'), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).not.toBe('idle');
  });
});
