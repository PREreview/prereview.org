import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { CompletedFormC } from '../../src/write-review/completed-form.ts'
import { FormC, formKey } from '../../src/write-review/form.ts'
import * as _ from '../../src/write-review/index.ts'
import * as fc from './fc.ts'

describe('writeReviewPersona', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.personaType().map(persona => Tuple.make(persona, { persona })),
    fc.user(),
    fc.supportedLocale(),
    fc.completedForm(),
  ])('when the form is completed', async (preprintId, preprintTitle, [persona, body], user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

    const actual = await _.writeReviewPersona({ body, locale, method: 'POST', id: preprintId, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ persona })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.personaType().map(persona => Tuple.make(persona, { persona })),
    fc.user(),
    fc.supportedLocale(),
    fc.incompleteForm(),
  ])('when the form is incomplete', async (preprintId, preprintTitle, [persona, body], user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewPersona({ body, locale, method: 'POST', id: preprintId, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ persona })
    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
  ])('when there is no form', async (preprintId, preprintTitle, body, method, user, locale) => {
    const actual = await _.writeReviewPersona({ body, locale, method, id: preprintId, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewPersona({ body, locale, method, id: preprintId, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be found',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewPersona({ body, locale, method, id: preprintId, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method, locale) => {
      const actual = await _.writeReviewPersona({ body, locale, method, id: preprintId, user: undefined })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.record({ persona: fc.string() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.form(),
  ])('without a persona', async (preprintId, preprintTitle, body, user, locale, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

    const actual = await _.writeReviewPersona({ body, locale, method: 'POST', id: preprintId, user })({
      formStore,
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      status: StatusCodes.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['error-summary.js'],
    })
  })
})
