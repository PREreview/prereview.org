import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as _ from '../../../src/WebApp/write-review/user-is-author.ts'
import * as fc from './fc.ts'

describe('ensureUserIsNotAnAuthor', () => {
  test.prop([fc.user(), fc.preprint()])('when user is not an author', (user, preprint) => {
    const actual = _.ensureUserIsNotAnAuthor(preprint)(user)

    expect(actual).toStrictEqual(E.right(user))
  })

  test.prop([
    fc
      .user()
      .chain(user =>
        fc.tuple(
          fc.constant(user),
          fc.preprint({ authors: fc.tuple(fc.record({ name: fc.string(), orcid: fc.constant(user.orcid) })) }),
        ),
      ),
  ])('when user is an author', ([user, preprint]) => {
    const actual = _.ensureUserIsNotAnAuthor(preprint)(user)

    expect(actual).toStrictEqual(E.left({ type: 'is-author', user }))
  })
})
