import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { StatusCodes } from 'http-status-codes'
import Keyv from 'keyv'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import * as fc from './fc.js'

describe('writeReviewFindingsNextSteps', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .tuple(fc.findingsNextSteps(), fc.findingsNextStepsDetails())
      .map(([findingsNextSteps, findingsNextStepsDetails]) =>
        Tuple.make(findingsNextSteps, findingsNextStepsDetails, {
          findingsNextSteps,
          findingsNextStepsInadequatelyDetails: findingsNextStepsDetails.inadequately,
          findingsNextStepsInsufficientlyDetails: findingsNextStepsDetails.insufficiently,
          findingsNextStepsAdequatelyDetails: findingsNextStepsDetails.adequately,
          findingsNextStepsClearlyInsightfullyDetails: findingsNextStepsDetails['clearly-insightfully'],
          findingsNextStepsExceptionallyDetails: findingsNextStepsDetails.exceptionally,
        }),
      ),
    fc.user(),
    fc.supportedLocale(),
    fc.completedQuestionsForm(),
  ])(
    'when the form is completed',
    async (preprintId, preprintTitle, [findingsNextSteps, findingsNextStepsDetails, body], user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        findingsNextSteps,
        findingsNextStepsDetails,
      })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SEE_OTHER,
        location: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .tuple(fc.findingsNextSteps(), fc.findingsNextStepsDetails())
      .map(([findingsNextSteps, findingsNextStepsDetails]) =>
        Tuple.make(findingsNextSteps, findingsNextStepsDetails, {
          findingsNextSteps,
          findingsNextStepsInadequatelyDetails: findingsNextStepsDetails.inadequately,
          findingsNextStepsInsufficientlyDetails: findingsNextStepsDetails.insufficiently,
          findingsNextStepsAdequatelyDetails: findingsNextStepsDetails.adequately,
          findingsNextStepsClearlyInsightfullyDetails: findingsNextStepsDetails['clearly-insightfully'],
          findingsNextStepsExceptionallyDetails: findingsNextStepsDetails.exceptionally,
        }),
      ),
    fc.user(),
    fc.supportedLocale(),
    fc.incompleteQuestionsForm(),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, [findingsNextSteps, findingsNextStepsDetails, body], user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        findingsNextSteps,
        findingsNextStepsDetails,
      })
      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SEE_OTHER,
        location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
  ])('when there is no form', async (preprintId, preprintTitle, body, method, user, locale) => {
    const actual = await _.writeReviewFindingsNextSteps({ body, locale, method, id: preprintId, user })({
      formStore: new Keyv(),
      getPreprintTitle: () => TE.right(preprintTitle),
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SEE_OTHER,
      location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprintId, body, method, user, locale) => {
      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method, id: preprintId, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.SERVICE_UNAVAILABLE,
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
      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method, id: preprintId, user })({
        formStore: new Keyv(),
        getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NOT_FOUND,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.record({ findingsNextSteps: fc.lorem() }, { requiredKeys: [] }),
    fc.user(),
    fc.supportedLocale(),
    fc.questionsForm(),
  ])(
    'without saying if the authors discuss their findings',
    async (preprintId, preprintTitle, body, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method: 'POST', id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        status: StatusCodes.BAD_REQUEST,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['conditional-inputs.js', 'error-summary.js'],
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.anything(),
    fc.string(),
    fc.user(),
    fc.supportedLocale(),
    fc.oneof(fc.freeformForm(), fc.constant({})),
  ])(
    "when you haven't said you want to answer questions",
    async (preprintId, preprintTitle, body, method, user, locale, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method, id: preprintId, user })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SEE_OTHER,
        location: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, body, method, locale) => {
      const formStore = new Keyv()

      const actual = await _.writeReviewFindingsNextSteps({ body, locale, method, id: preprintId, user: undefined })({
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SEE_OTHER,
        location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
      })
    },
  )
})
