import type { Types } from 'effect'
import type { Reader } from 'fp-ts/lib/Reader.js'

export type EnvFor<T> = Types.UnionToIntersection<T extends Reader<infer R, unknown> ? R : never>

export const withEnv =
  <R, A extends ReadonlyArray<unknown>, B>(f: (...a: A) => Reader<R, B>, r: R) =>
  (...a: A) =>
    f(...a)(r)
