import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { PreprintIsUnavailable, type GetPreprintTitleEnv } from '../../src/preprint.js'
import * as _ from '../../src/request-review-flow/persona-page/index.js'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../src/review-request.js'
import {
  requestReviewCheckMatch,
  requestReviewMatch,
  requestReviewPersonaMatch,
  requestReviewPublishedMatch,
} from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('requestReviewPersona', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
          fc.constantFrom('public', 'pseudonym'),
          fc.supportedLocale(),
        ])('when the persona is set', async (preprint, user, reviewRequest, preprintTitle, persona, locale) => {
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

          const actual = await _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
            getReviewRequest,
            getPreprintTitle,
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: Status.SeeOther,
            location: format(requestReviewCheckMatch.formatter, { id: preprintTitle.id }),
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { ...reviewRequest, persona })
        })

        test.prop([
          fc.indeterminatePreprintId(),
          fc.user(),
          fc.incompleteReviewRequest(),
          fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
          fc.constantFrom('public', 'pseudonym'),
          fc.supportedLocale(),
        ])("when the persona can't be set", async (preprint, user, reviewRequest, preprintTitle, persona, locale) => {
          const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.left('unavailable'))

          const actual = await _.requestReviewPersona({ body: { persona }, preprint, method: 'POST', user, locale })({
            getReviewRequest: () => TE.right(reviewRequest),
            getPreprintTitle: () => TE.right(preprintTitle),
            saveReviewRequest,
          })()

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: Status.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id, { ...reviewRequest, persona })
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        fc.anything(),
        fc.supportedLocale(),
      ])('when the form is invalid', async (preprint, user, reviewRequest, preprintTitle, body, locale) => {
        const actual = await _.requestReviewPersona({ body, preprint, method: 'POST', user, locale })({
          getReviewRequest: () => TE.right(reviewRequest),
          getPreprintTitle: () => TE.right(preprintTitle),
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          canonical: format(requestReviewPersonaMatch.formatter, { id: preprintTitle.id }),
          status: Status.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.user(),
        fc.incompleteReviewRequest(),
        fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
        fc.string().filter(method => method !== 'POST'),
        fc.anything(),
        fc.supportedLocale(),
      ])(
        'when the form needs submitting',
        async (preprint, user, reviewRequest, preprintTitle, method, body, locale) => {
          const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.right(reviewRequest))
          const getPreprintTitle = jest.fn<GetPreprintTitleEnv['getPreprintTitle']>(_ => TE.right(preprintTitle))

          const actual = await _.requestReviewPersona({ body, preprint, method, user, locale })({
            getReviewRequest,
            getPreprintTitle,
            saveReviewRequest: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewPersonaMatch.formatter, { id: preprintTitle.id }),
            status: Status.OK,
            title: expect.anything(),
            nav: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'form',
            js: [],
          })
          expect(getReviewRequest).toHaveBeenCalledWith(user.orcid, preprintTitle.id)
          expect(getPreprintTitle).toHaveBeenCalledWith(preprint)
        },
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.completedReviewRequest(),
      fc.string(),
      fc.anything(),
      fc.supportedLocale(),
    ])(
      'when the request is already complete',
      async (preprint, user, preprintTitle, reviewRequest, method, body, locale) => {
        const actual = await _.requestReviewPersona({ body, preprint, method, user, locale })({
          getReviewRequest: () => TE.right(reviewRequest),
          getPreprintTitle: () => TE.right(preprintTitle),
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, { id: preprint }),
        })
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.user(),
      fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
      fc.string(),
      fc.anything(),
      fc.supportedLocale(),
    ])("when a request hasn't been started", async (preprint, user, preprintTitle, method, body, locale) => {
      const actual = await _.requestReviewPersona({ body, preprint, method, user, locale })({
        getReviewRequest: () => TE.left('not-found'),
        getPreprintTitle: () => TE.right(preprintTitle),
        saveReviewRequest: shouldNotBeCalled,
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.user(),
    fc.preprintTitle({ id: fc.reviewRequestPreprintId() }),
    fc.string(),
    fc.anything(),
    fc.supportedLocale(),
  ])('when the request cannot be loaded', async (preprint, user, preprintTitle, method, body, locale) => {
    const actual = await _.requestReviewPersona({ body, preprint, method, user, locale })({
      getReviewRequest: () => TE.left('unavailable'),
      getPreprintTitle: () => TE.right(preprintTitle),
      saveReviewRequest: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.user(), fc.string(), fc.anything(), fc.supportedLocale()])(
    'when the preprint cannot be loaded',
    async (preprint, user, method, body, locale) => {
      const actual = await _.requestReviewPersona({ body, preprint, method, user, locale })({
        getReviewRequest: () => shouldNotBeCalled,
        getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.string(), fc.anything(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (preprint, method, body, locale) => {
      const actual = await _.requestReviewPersona({ body, preprint, method, locale })({
        getReviewRequest: shouldNotBeCalled,
        getPreprintTitle: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(requestReviewMatch.formatter, { id: preprint }),
      })
    },
  )
})
