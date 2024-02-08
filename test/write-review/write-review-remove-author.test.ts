import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import type { CanInviteAuthorsEnv } from '../../src/feature-flags'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import { writeReviewAddAuthorsMatch, writeReviewMatch, writeReviewRemoveAuthorMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewRemoveAuthor', () => {
  describe('when authors can be invited', () => {
    describe('when the form is submitted', () => {
      test.prop([
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.record({ removeAuthor: fc.constantFrom('yes', 'no') }),
        fc.user(),
        fc
          .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
          .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
      ])('when the form is valid', async (id, preprintTitle, body, user, [newReview, number]) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await _.writeReviewRemoveAuthor({ body, id, method: 'POST', number, user })({
          canInviteAuthors: () => true,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.stringContaining('problems'),
          main: expect.stringContaining('problems'),
          skipToLabel: 'main',
          js: [],
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
        fc.anything(),
        fc.user(),
        fc
          .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
          .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
      ])('when the form is invalid', async (id, preprintTitle, body, user, [newReview, number]) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await _.writeReviewRemoveAuthor({ body, id, method: 'POST', number, user })({
          canInviteAuthors: () => true,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(writeReviewRemoveAuthorMatch.formatter, { id: preprintTitle.id, number }),
          status: Status.BadRequest,
          title: expect.stringContaining('Error:'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('Error:'),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string().filter(method => method !== 'POST'),
      fc.user(),
      fc
        .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
        .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
    ])('when the form needs submitting', async (id, preprintTitle, body, method, user, [newReview, number]) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
        canInviteAuthors: () => true,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewRemoveAuthorMatch.formatter, { id: preprintTitle.id, number }),
        status: Status.OK,
        title: expect.stringContaining('want to remove'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('want to remove'),
        skipToLabel: 'form',
        js: [],
      })
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.user(),
      fc
        .form({ moreAuthors: fc.constant('yes') })
        .chain(form =>
          fc.tuple(
            fc.constant(form),
            form.otherAuthors
              ? fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: form.otherAuthors.length }))
              : fc.integer(),
          ),
        ),
    ])("when the number doesn't match", async (id, preprintTitle, body, method, user, [newReview, number]) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
        canInviteAuthors: () => true,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
      })
    })

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.integer(), fc.user()])(
      'when there is no form',
      async (id, preprintTitle, body, method, number, user) => {
        const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
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
      fc.integer(),
      fc.user(),
      fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
    ])('when there are no more authors', async (id, preprintTitle, body, method, number, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
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

    test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.integer(), fc.user()])(
      'when the preprint cannot be loaded',
      async (id, body, method, number, user) => {
        const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('unavailable'))

        const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
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

    test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.integer(), fc.user()])(
      'when the preprint cannot be found',
      async (id, body, method, number, user) => {
        const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.integer(), fc.user()])(
    "when authors can't be invited",
    async (id, preprintTitle, body, method, number, user) => {
      const canInviteAuthors = jest.fn<CanInviteAuthorsEnv['canInviteAuthors']>(_ => false)

      const actual = await _.writeReviewRemoveAuthor({ body, id, method, number, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.integer(), fc.boolean()])(
    "when there isn't a session",
    async (id, preprintTitle, body, method, number, canInviteAuthors) => {
      const actual = await _.writeReviewRemoveAuthor({ body, id, method, number })({
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
