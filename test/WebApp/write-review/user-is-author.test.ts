import { describe, expect, it } from '@effect/vitest'
import { Either } from 'effect'
import * as _ from '../../../src/WebApp/write-review/user-is-author.ts'
import * as fc from './fc.ts'

describe('ensureUserIsNotAnAuthor', () => {
  it.prop('when user is not an author', [fc.user(), fc.preprint()], ([user, preprint]) => {
    const actual = _.ensureUserIsNotAnAuthor(preprint)(user)

    expect(actual).toStrictEqual(Either.right(user))
  })

  it.prop(
    'when user is an author',
    [
      fc
        .user()
        .chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.preprint({ authors: fc.tuple(fc.record({ name: fc.name(), orcid: fc.constant(user.orcid) })) }),
          ),
        ),
    ],
    ([[user, preprint]]) => {
      const actual = _.ensureUserIsNotAnAuthor(preprint)(user)

      expect(actual).toStrictEqual(Either.left({ type: 'is-author', user }))
    },
  )
})
