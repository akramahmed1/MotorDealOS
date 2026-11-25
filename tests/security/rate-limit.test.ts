import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkRateLimit, type RateLimitStore } from '../../src/lib/rate-limit';

function memoryStore(initial: { id: string; request_count: number } | null): RateLimitStore & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async find() {
      return initial;
    },
    async insert() {
      calls.push('insert');
    },
    async increment(_id, nextCount) {
      calls.push(`increment:${nextCount}`);
    },
  };
}

describe('checkRateLimit', () => {
  it('inserts a counter for a new visitor and allows the request', async () => {
    const store = memoryStore(null);
    assert.equal(await checkRateLimit('1.2.3.4', 'chat', 20, store), true);
    assert.deepEqual(store.calls, ['insert']);
  });

  it('increments while the visitor is under the cap', async () => {
    const store = memoryStore({ id: 'row-1', request_count: 19 });
    assert.equal(await checkRateLimit('1.2.3.4', 'chat', 20, store), true);
    assert.deepEqual(store.calls, ['increment:20']);
  });

  it('blocks at the cap without writing', async () => {
    const store = memoryStore({ id: 'row-1', request_count: 20 });
    assert.equal(await checkRateLimit('1.2.3.4', 'leads', 20, store), false);
    assert.deepEqual(store.calls, []);
  });

  it('fails closed when the counter cannot be read', async () => {
    const store: RateLimitStore = {
      async find() {
        throw new Error('relation rate_limits does not exist');
      },
      async insert() {
        throw new Error('should not insert');
      },
      async increment() {
        throw new Error('should not increment');
      },
    };
    assert.equal(await checkRateLimit('1.2.3.4', 'chat', 20, store), false);
  });
});
