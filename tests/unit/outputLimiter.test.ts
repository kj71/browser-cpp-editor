import { describe, it, expect } from 'vitest';
import { OutputLimiter, MAX_OUTPUT_BYTES } from '../../src/runner/outputLimiter';

describe('OutputLimiter', () => {
  it('should accept chunks within limit and track total bytes', () => {
    const limiter = new OutputLimiter();
    const chunk1 = new Uint8Array([1, 2, 3, 4, 5]);
    const res1 = limiter.push(chunk1);

    expect(res1.overflow).toBe(false);
    expect(res1.acceptedLength).toBe(5);
    expect(limiter.totalBytes).toBe(5);
    expect(limiter.hasOverflowed).toBe(false);
  });

  it('should cut off at exactly 1,048,576 bytes', () => {
    const limiter = new OutputLimiter();
    // 1 MiB is 1048576 bytes
    const largeChunk = new Uint8Array(1048570); // 6 bytes remaining
    const res1 = limiter.push(largeChunk);
    expect(res1.overflow).toBe(false);
    expect(res1.acceptedLength).toBe(1048570);
    expect(limiter.totalBytes).toBe(1048570);

    const overflowChunk = new Uint8Array(10); // Attempt 10 bytes -> only 6 should be accepted
    const res2 = limiter.push(overflowChunk);
    expect(res2.overflow).toBe(true);
    expect(res2.acceptedLength).toBe(6);
    expect(res2.accepted.length).toBe(6);
    expect(limiter.totalBytes).toBe(MAX_OUTPUT_BYTES);
    expect(limiter.hasOverflowed).toBe(true);

    // Any subsequent push returns 0 bytes and overflow true
    const subsequentChunk = new Uint8Array(5);
    const res3 = limiter.push(subsequentChunk);
    expect(res3.overflow).toBe(true);
    expect(res3.acceptedLength).toBe(0);
    expect(res3.accepted.length).toBe(0);
    expect(limiter.totalBytes).toBe(MAX_OUTPUT_BYTES);
  });

  it('should handle multi-byte UTF-8 sequences at the exact boundary', () => {
    const limiter = new OutputLimiter();
    // Fill up to 2 bytes before the limit
    const prefix = new Uint8Array(MAX_OUTPUT_BYTES - 2);
    limiter.push(prefix);
    expect(limiter.totalBytes).toBe(MAX_OUTPUT_BYTES - 2);

    // 🚀 is 4 bytes in UTF-8: 0xF0, 0x9F, 0x9A, 0x80
    const rocketBytes = new Uint8Array([0xf0, 0x9f, 0x9a, 0x80]);
    const res = limiter.push(rocketBytes);

    expect(res.overflow).toBe(true);
    expect(res.acceptedLength).toBe(2);
    expect(res.accepted.length).toBe(2);
    expect(Array.from(res.accepted)).toEqual([0xf0, 0x9f]);
    expect(limiter.totalBytes).toBe(MAX_OUTPUT_BYTES);
  });

  it('should correctly interleave stdout and stderr tracking toward the limit', () => {
    const limiter = new OutputLimiter();

    // 500,000 bytes from stdout
    const stdout1 = limiter.push(new Uint8Array(500000));
    expect(stdout1.overflow).toBe(false);
    expect(limiter.totalBytes).toBe(500000);

    // 500,000 bytes from stderr
    const stderr1 = limiter.push(new Uint8Array(500000));
    expect(stderr1.overflow).toBe(false);
    expect(limiter.totalBytes).toBe(1000000);

    // 40,000 bytes from stdout
    const stdout2 = limiter.push(new Uint8Array(40000));
    expect(stdout2.overflow).toBe(false);
    expect(limiter.totalBytes).toBe(1040000);

    // 10,000 bytes from stderr (remaining is 8,576)
    const stderr2 = limiter.push(new Uint8Array(10000));
    expect(stderr2.overflow).toBe(true);
    expect(stderr2.acceptedLength).toBe(8576);
    expect(limiter.totalBytes).toBe(MAX_OUTPUT_BYTES);

    // Later write from stdout rejected
    const stdout3 = limiter.push(new Uint8Array(100));
    expect(stdout3.overflow).toBe(true);
    expect(stdout3.acceptedLength).toBe(0);
  });
});
