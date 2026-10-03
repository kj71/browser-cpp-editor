import { describe, it, expect } from 'vitest';
import { parseDiagnostics } from '../../src/compiler/diagnostics';

describe('Diagnostics Parser', () => {
  it('should parse standard error diagnostics', () => {
    const stderr = `main.cpp:4:12: error: expected ';' after expression
    int x = 5
           ^
           ;`;

    const diags = parseDiagnostics(stderr);
    expect(diags).toHaveLength(1);
    expect(diags[0]).toEqual({
      file: 'main.cpp',
      line: 4,
      column: 12,
      severity: 'error',
      message: "expected ';' after expression",
      raw: `main.cpp:4:12: error: expected ';' after expression\n    int x = 5\n           ^\n           ;`
    });
  });

  it('should parse warnings and notes', () => {
    const stderr = `main.cpp:10:7: warning: unused variable 'y' [-Wunused-variable]
      int y = 10;
          ^
main.cpp:15:3: note: candidate function not viable: requires 2 arguments, but 1 was provided
  void foo(int a, int b);
  ^`;

    const diags = parseDiagnostics(stderr);
    expect(diags).toHaveLength(2);
    expect(diags[0].severity).toBe('warning');
    expect(diags[0].line).toBe(10);
    expect(diags[0].column).toBe(7);
    expect(diags[0].message).toContain("unused variable 'y'");

    expect(diags[1].severity).toBe('note');
    expect(diags[1].line).toBe(15);
    expect(diags[1].column).toBe(3);
    expect(diags[1].message).toContain('candidate function not viable');
  });

  it('should map exceptions disabled diagnostics to clear explanations', () => {
    const stderr = `main.cpp:2:5: error: cannot use 'try' with exceptions disabled
    try {
    ^
main.cpp:3:9: error: cannot use 'throw' with exceptions disabled
        throw 1;
        ^`;

    const diags = parseDiagnostics(stderr);
    expect(diags).toHaveLength(2);
    expect(diags[0].message).toContain("cannot use 'try' with exceptions disabled");
    expect(diags[0].message).toContain('WebAssembly browser environment');
    expect(diags[1].message).toContain("cannot use 'throw' with exceptions disabled");
    expect(diags[1].message).toContain('WebAssembly browser environment');
  });

  it('should handle multi-line diagnostics gracefully', () => {
    const stderr = `In file included from main.cpp:1:
main.cpp:7:15: error: no matching member function for call to 'push_back'
    v.push_back("invalid");
    ~~^~~~~~~~~
/usr/include/c++/v1/vector:672:36: note: candidate function not viable
    void push_back(const value_type& __x);
         ^`;

    const diags = parseDiagnostics(stderr);
    expect(diags.length).toBeGreaterThanOrEqual(2);
    expect(diags[0].file).toBe('main.cpp');
    expect(diags[0].line).toBe(7);
    expect(diags[0].severity).toBe('error');
    expect(diags[1].file).toBe('vector');
    expect(diags[1].severity).toBe('note');
  });
});
