/**
 * 최소제곱법 2차 다항 회귀:  y = a·x² + b·x + c
 * 정규방정식 (3x3)을 직접 풀어서 외부 라이브러리 없이 동작.
 */
export type Quadratic = { a: number; b: number; c: number; r2: number };

export function fitQuadratic(xs: number[], ys: number[]): Quadratic | null {
  const n = xs.length;
  if (n < 3) return null;

  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i];
    const x2 = x * x;
    sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
    sy += y; sxy += x * y; sx2y += x2 * y;
  }

  // [ sx4 sx3 sx2 ] [a]   [sx2y]
  // [ sx3 sx2 sx  ] [b] = [sxy ]
  // [ sx2 sx  n   ] [c]   [sy  ]
  const sol = solve3(
    [[sx4, sx3, sx2], [sx3, sx2, sx], [sx2, sx, n]],
    [sx2y, sxy, sy]
  );
  if (!sol) return null;
  const [a, b, c] = sol;

  // R²
  const mean = sy / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = a * xs[i] * xs[i] + b * xs[i] + c;
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - mean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { a, b, c, r2 };
}

/** 꼭짓점 (최대/최소 지점) */
export function vertex(q: Quadratic) {
  if (q.a === 0) return null;
  const x = -q.b / (2 * q.a);
  return { x, y: q.a * x * x + q.b * x + q.c, isMax: q.a < 0 };
}

export function evalQuadratic(q: Quadratic, x: number) {
  return q.a * x * x + q.b * x + q.c;
}

export function formatEquation(q: Quadratic, digits = 4) {
  const f = (v: number) => v.toFixed(digits);
  const sign = (v: number) => (v < 0 ? "− " : "+ ");
  return `y = ${f(q.a)}x² ${sign(q.b)}${f(Math.abs(q.b))}x ${sign(q.c)}${f(Math.abs(q.c))}`;
}

function solve3(A: number[][], b: number[]): number[] | null {
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++)
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    if (Math.abs(m[piv][col]) < 1e-12) return null;
    [m[col], m[piv]] = [m[piv], m[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let k = col; k < 4; k++) m[r][k] -= f * m[col][k];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}
