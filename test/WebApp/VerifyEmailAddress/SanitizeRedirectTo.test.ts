import { expect, it } from '@effect/vitest'
import * as _ from '../../../src/WebApp/VerifyEmailAddress/SanitizeRedirectTo.ts'

it.each<[_.Input, _.Result]>([
  [undefined, '/my-details'],
  ['/', '/'],
  ['/path', '/path'],
  ['/path?foo=bar', '/path?foo=bar'],
  ['/path#foo', '/path'],
  ['//evil.com', '/my-details'],
  ['//evil.com/path', '/my-details'],
  ['//example.com@evil.com', '/my-details'],
  ['//example.com@evil.com/path', '/my-details'],
  ['/path/..//evil.com', '/my-details'],
])('%s', (redirectTo, expected) => {
  const actual = _.SanitizeRedirectTo(redirectTo)

  expect(actual).toBe(expected)
})
