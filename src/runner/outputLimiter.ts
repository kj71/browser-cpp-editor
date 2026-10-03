export const MAX_OUTPUT_BYTES = 1048576; // 1 MiB (1,048,576 bytes)

export interface LimitResult {
  accepted: Uint8Array;
  overflow: boolean;
  acceptedLength: number;
}

export class OutputLimiter {
  readonly limit: number;
  private currentBytes = 0;
  private overflowed = false;

  constructor(limit: number = MAX_OUTPUT_BYTES) {
    this.limit = limit;
  }

  get totalBytes(): number {
    return this.currentBytes;
  }

  get hasOverflowed(): boolean {
    return this.overflowed;
  }

  /**
   * Pushes a Uint8Array chunk into the limiter.
   * Tracks total bytes across chunks (e.g. stdout and stderr interleaved).
   * Cuts off at exactly `limit` bytes.
   */
  push(chunk: Uint8Array): LimitResult {
    if (this.overflowed) {
      return {
        accepted: new Uint8Array(0),
        overflow: true,
        acceptedLength: 0
      };
    }

    const remaining = this.limit - this.currentBytes;
    if (chunk.byteLength <= remaining) {
      this.currentBytes += chunk.byteLength;
      return {
        accepted: chunk,
        overflow: false,
        acceptedLength: chunk.byteLength
      };
    } else {
      // Cut at exact boundary
      const accepted = chunk.slice(0, remaining);
      this.currentBytes = this.limit;
      this.overflowed = true;
      return {
        accepted,
        overflow: true,
        acceptedLength: remaining
      };
    }
  }

  /**
   * Helper to push string data, encoded as UTF-8.
   */
  pushString(str: string): { acceptedText: string; overflow: boolean; acceptedBytes: number } {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const result = this.push(bytes);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const acceptedText = decoder.decode(result.accepted);
    return {
      acceptedText,
      overflow: result.overflow,
      acceptedBytes: result.acceptedLength
    };
  }

  reset(): void {
    this.currentBytes = 0;
    this.overflowed = false;
  }
}
