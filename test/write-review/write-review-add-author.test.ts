import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import type { CanInviteAuthorsEnv } from '../../src/feature-flags'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { CompletedFormC } from '../../src/write-review/completed-form'
import { FormC, formKey } from '../../src/write-review/form'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewAddAuthor', () => {
  describe('when authors can be invited', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.completedForm({ moreAuthors: fc.constant('yes' as const), otherAuthors: fc.otherAuthors() }),
    ])('when the form is completed', async (id, preprintTitle, body, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewAddAuthor({ body, id, method: 'POST', user })({
        canInviteAuthors: () => true,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
      })
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        otherAuthors: [...newReview.otherAuthors, body],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() }),
      fc.user(),
      fc.incompleteForm({ moreAuthors: fc.constant('yes') }),
    ])('when the form is incomplete', async (id, preprintTitle, body, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthor({ body, id, method: 'POST', user })({
        canInviteAuthors: () => true,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
      })
    })

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user()])(
      'when there is no form',
      async (id, preprintTitle, body, method, user) => {
        const actual = await _.writeReviewAddAuthor({ body, id, method, user })({
          canInviteAuthors: () => true,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.right(preprintTitle),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
    ])('when there are no more authors', async (id, preprintTitle, body, method, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewAddAuthor({ body, id, method, user })({
        canInviteAuthors: () => true,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
      'when the preprint cannot be loaded',
      async (id, body, method, user) => {
        const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('unavailable'))

        const actual = await _.writeReviewAddAuthor({ body, id, method, user })({
          canInviteAuthors: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
        expect(getPreprintTitle).toHaveBeenCalledWith(id)
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user()])(
      'when the preprint cannot be found',
      async (id, body, method, user) => {
        const actual = await _.writeReviewAddAuthor({ body, id, method, user })({
          canInviteAuthors: shouldNotBeCalled,
          formStore: new Keyv(),
          getPreprintTitle: () => TE.left('not-found'),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.NotFound,
          title: expect.stringContaining('not found'),
          main: expect.stringContaining('not found'),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user()])(
    "when authors can't be invited",
    async (id, preprintTitle, body, method, user) => {
      const canInviteAuthors = jest.fn<CanInviteAuthorsEnv['canInviteAuthors']>(_ => false)

      const actual = await _.writeReviewAddAuthor({ body, id, method, user })({
        canInviteAuthors,
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
      expect(canInviteAuthors).toHaveBeenCalledWith(user)
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.boolean()])(
    "when there isn't a session",
    async (id, preprintTitle, body, method, canInviteAuthors) => {
      const actual = await _.writeReviewAddAuthor({ body, id, method })({
        canInviteAuthors: () => canInviteAuthors,
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )
})
