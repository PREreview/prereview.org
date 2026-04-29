import { it } from '@effect/vitest'
import * as E from 'fp-ts/lib/Either.js'
import { describe, expect } from 'vitest'
import * as _ from '../../../src/WebApp/write-review/user-is-author.ts'
import * as fc from './fc.ts'

describe('ensureUserIsNotAnAuthor', () => {
  it.prop('when user is not an author', [fc.user(), fc.preprint()], ([user, preprint]) => {
    const actual = _.ensureUserIsNotAnAuthor(preprint)(user)

    expect(actual).toStrictEqual(E.right(user))
  })

  it.prop(
    'when user is an author',
    [
      fc
        .user()
        .chain(user =>
          fc.tuple(
            fc.constant(user),
            fc.preprint({ authors: fc.tuple(fc.record({ name: fc.string(), orcid: fc.constant(user.orcid) })) }),
          ),
        ),
    ],
    ([[user, preprint]]) => {
      const actual = _.ensureUserIsNotAnAuthor(preprint)(user)

      expect(actual).toStrictEqual(E.left({ type: 'is-author', user }))
    },
  )
})
