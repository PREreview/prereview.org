import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import { writeReviewAddAuthorsMatch, writeReviewChangeAuthorMatch, writeReviewMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import * as fc from './fc'

describe('writeReviewChangeAuthor', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.user(),
    fc
      .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
      .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
  ])('when the form is submitted', async (id, preprintTitle, user, [newReview, number]) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ id, method: 'POST', number, user })({
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
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc
      .form({ moreAuthors: fc.constant('yes'), otherAuthors: fc.otherAuthors({ minLength: 1 }) })
      .chain(form => fc.tuple(fc.constant(form), fc.integer({ min: 1, max: form.otherAuthors?.length }))),
  ])('when the form needs submitting', async (id, preprintTitle, method, user, [newReview, number]) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ id, method, number, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(writeReviewChangeAuthorMatch.formatter, { id: preprintTitle.id, number }),
      status: Status.OK,
      title: expect.stringContaining('Change'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('Change'),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.string(),
    fc.user(),
    fc
      .form({ moreAuthors: fc.constant('yes') })
      .chain(form =>
        fc.tuple(
          fc.constant(form),
          form.otherAuthors
            ? fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: form.otherAuthors.length + 1 }))
            : fc.integer(),
        ),
      ),
  ])("when the number doesn't match", async (id, preprintTitle, method, user, [newReview, number]) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ id, method, number, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.integer(), fc.user()])(
    'when there is no form',
    async (id, preprintTitle, method, number, user) => {
      const actual = await _.writeReviewChangeAuthor({ id, method, number, user })({
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
    fc.string(),
    fc.integer(),
    fc.user(),
    fc.form({ moreAuthors: fc.constantFrom('yes-private', 'no') }),
  ])('when there are no more authors', async (id, preprintTitle, method, number, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewChangeAuthor({ id, method, number, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.integer(), fc.user()])(
    'when the preprint cannot be loaded',
    async (id, method, number, user) => {
      const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.left('unavailable'))

      const actual = await _.writeReviewChangeAuthor({ id, method, number, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.integer(), fc.user()])(
    'when the preprint cannot be found',
    async (id, method, number, user) => {
      const actual = await _.writeReviewChangeAuthor({ id, method, number, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.string(), fc.integer()])(
    "when there isn't a session",
    async (id, preprintTitle, method, number) => {
      const actual = await _.writeReviewChangeAuthor({ id, method, number })({
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
