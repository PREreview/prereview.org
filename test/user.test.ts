import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as _ from '../src/user.js'
import * as fc from './fc.js'

describe('UserC', () => {
  test.prop([fc.user()])('when the user can be decoded', user => {
    const actual = pipe(user, _.UserC.encode, _.UserC.decode)

    expect(actual).toStrictEqual(D.success(user))
  })

  test.prop([fc.string()])('when the user cannot be decoded', string => {
    const actual = _.UserC.decode(string)

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })
})

test.prop([fc.user()])('newSessionForUser', user => {
  const actual = _.newSessionForUser(user)

  expect(actual).toStrictEqual({ user })
})

describe('getUserFromSession', () => {
  test.prop([fc.user()])('when there is a user', user => {
    const actual = _.getUserFromSession({ user })

    expect(actual).toStrictEqual(Option.some(user))
  })

  test.prop([fc.jsonRecord()])("when there isn't a user", session => {
    const actual = _.getUserFromSession(session)

    expect(actual).toStrictEqual(Option.none())
  })
})
