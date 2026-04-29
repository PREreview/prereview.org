import { describe, expect, it } from '@effect/vitest'
import { pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../src/user.ts'
import * as fc from './fc.ts'

describe('UserC', () => {
  it.prop('when the user can be decoded', [fc.user()], ([user]) => {
    const actual = pipe(user, _.UserC.encode, _.UserC.decode)

    expect(actual).toStrictEqual(D.success(user))
  })

  it.prop('when the user cannot be decoded', [fc.string()], ([string]) => {
    const actual = _.UserC.decode(string)

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })
})

it.prop('newSessionForUser', [fc.user()], ([user]) => {
  const actual = _.newSessionForUser(user)

  expect(actual).toStrictEqual({ user })
})
