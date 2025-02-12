import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewMatch, writeReviewUseOfAiMatch } from '../../src/routes.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewUseOfAi', () => {
  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale(), fc.form()])(
    'when there is a form',
    async (preprintId, preprintTitle, user, locale, form) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form))

      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi: true,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprintTitle.id }),
        status: Status.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale()])(
    "when there isn't a form",
    async (preprintId, preprintTitle, user, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi: true,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.supportedLocale()])(
    'when the feature flag is turned off',
    async (preprintId, preprintTitle, user, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi: false,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.boolean(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, mustDeclareUseOfAi, locale) => {
      const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user: undefined })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
        mustDeclareUseOfAi,
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
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.boolean(),
  ])('when the preprint cannot be loaded', async (preprintId, user, locale, mustDeclareUseOfAi) => {
    const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
      mustDeclareUseOfAi,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.boolean(),
  ])('when the preprint is not found', async (preprintId, user, locale, mustDeclareUseOfAi) => {
    const actual = await _.writeReviewUseOfAi({ id: preprintId, locale, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
      mustDeclareUseOfAi,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})

describe('writeReviewUseOfAiSubmission', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.user(),
    fc.anything(),
    fc.supportedLocale(),
    fc.form(),
  ])('when there is a form', async (preprintId, preprintTitle, user, body, locale, form) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(form))

    const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.user(), fc.anything(), fc.supportedLocale()])(
    "when there isn't a form",
    async (preprintId, preprintTitle, user, body, locale) => {
      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, locale) => {
      const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user: undefined })({
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
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.anything(),
  ])('when the preprint cannot be loaded', async (preprintId, user, locale, body) => {
    const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.anything(),
  ])('when the preprint is not found', async (preprintId, user, locale, body) => {
    const actual = await _.writeReviewUseOfAiSubmission({ body, id: preprintId, locale, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })
})
