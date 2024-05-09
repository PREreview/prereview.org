import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as _ from '../../src/my-prereviews-page/require-log-in'
import { myPrereviewsMatch } from '../../src/routes'
import * as fc from '../fc'

describe('ensureUserIsLoggedIn', () => {
  test.prop([fc.user()])('when there is a user', user => {
    const actual = _.ensureUserIsLoggedIn(user)

    expect(actual).toStrictEqual(E.right(user))
  })

  test("when there isn't a user", () => {
    const actual = _.ensureUserIsLoggedIn(undefined)

    expect(actual).toStrictEqual(E.left(_.RequireLogIn))
  })
})

test('toResponse', () => {
  const actual = _.toResponse(_.RequireLogIn)

  expect(actual).toStrictEqual({
    _tag: 'LogInResponse',
    location: format(myPrereviewsMatch.formatter, {}),
  })
})
