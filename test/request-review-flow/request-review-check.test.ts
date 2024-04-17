import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-review-flow'
import { RedirectResponse } from '../../src/response'
import type { GetReviewRequestEnv, SaveReviewRequestEnv } from '../../src/review-request'
import { requestReviewCheckMatch, requestReviewMatch, requestReviewPublishedMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('requestReviewCheck', () => {
  describe('when the user is logged in', () => {
    describe('when there is a incomplete request', () => {
      describe('when the form has been submitted', () => {
        test.prop([fc.user(), fc.incompleteReviewRequest()])(
          'when the request can be published',
          async (user, reviewRequest) => {
            const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.right(undefined))

            const actual = await _.requestReviewCheck({
              method: 'POST',
              user,
            })({
              getReviewRequest: () => TE.right(reviewRequest),
              publishRequest: () => TE.right(undefined),
              saveReviewRequest,
            })()

            expect(actual).toStrictEqual(
              RedirectResponse({ location: format(requestReviewPublishedMatch.formatter, {}) }),
            )
            expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, { status: 'completed' })
          },
        )

        test.prop([fc.user(), fc.incompleteReviewRequest()])(
          "when the request state can't be changed",
          async (user, reviewRequest) => {
            const saveReviewRequest = jest.fn<SaveReviewRequestEnv['saveReviewRequest']>(_ => TE.left('unavailable'))

            const actual = await _.requestReviewCheck({
              method: 'POST',
              user,
            })({
              getReviewRequest: () => TE.right(reviewRequest),
              publishRequest: () => TE.right(undefined),
              saveReviewRequest,
            })()

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: Status.ServiceUnavailable,
              title: expect.stringContaining('problems'),
              main: expect.stringContaining('unable to'),
              skipToLabel: 'main',
              js: [],
            })
            expect(saveReviewRequest).toHaveBeenCalledWith(user.orcid, { status: 'completed' })
          },
        )

        test.prop([fc.user(), fc.incompleteReviewRequest()])(
          'when the request can not be published',
          async (user, reviewRequest) => {
            const actual = await _.requestReviewCheck({
              method: 'POST',
              user,
            })({
              getReviewRequest: () => TE.right(reviewRequest),
              publishRequest: () => TE.left('unavailable'),
              saveReviewRequest: shouldNotBeCalled,
            })()

            expect(actual).toStrictEqual({
              _tag: 'StreamlinePageResponse',
              status: Status.ServiceUnavailable,
              title: expect.stringContaining('problems'),
              main: expect.stringContaining('unable to'),
              skipToLabel: 'main',
              js: [],
            })
          },
        )
      })

      test.prop([fc.string().filter(method => method !== 'POST'), fc.user(), fc.incompleteReviewRequest()])(
        'when the form needs submitting',
        async (method, user, reviewRequest) => {
          const actual = await _.requestReviewCheck({
            method,
            user,
          })({
            getReviewRequest: () => TE.right(reviewRequest),
            publishRequest: shouldNotBeCalled,
            saveReviewRequest: shouldNotBeCalled,
          })()

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: format(requestReviewCheckMatch.formatter, {}),
            status: Status.OK,
            title: expect.stringContaining('Check your request'),
            main: expect.stringContaining('Check your request'),
            skipToLabel: 'form',
            js: ['single-use-form.js'],
          })
        },
      )
    })

    test.prop([fc.string(), fc.user(), fc.completedReviewRequest()])(
      'when the request is already complete',
      async (method, user, reviewRequest) => {
        const actual = await _.requestReviewCheck({
          method,
          user,
        })({
          getReviewRequest: () => TE.right(reviewRequest),
          publishRequest: shouldNotBeCalled,
          saveReviewRequest: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: Status.SeeOther,
          location: format(requestReviewPublishedMatch.formatter, {}),
        })
      },
    )

    test.prop([fc.string(), fc.user()])("when a request hasn't been started", async (method, user) => {
      const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('not-found'))

      const actual = await _.requestReviewCheck({
        method,
        user,
      })({
        getReviewRequest,
        publishRequest: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
      expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([fc.string(), fc.user()])("when the request can't be loaded", async (method, user) => {
      const getReviewRequest = jest.fn<GetReviewRequestEnv['getReviewRequest']>(_ => TE.left('unavailable'))

      const actual = await _.requestReviewCheck({
        method,
        user,
      })({
        getReviewRequest,
        publishRequest: shouldNotBeCalled,
        saveReviewRequest: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(getReviewRequest).toHaveBeenCalledWith(user.orcid)
    })
  })

  test.prop([fc.string()])('when the user is not logged in', async method => {
    const actual = await _.requestReviewCheck({ method })({
      getReviewRequest: shouldNotBeCalled,
      publishRequest: shouldNotBeCalled,
      saveReviewRequest: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestReviewMatch.formatter, {}),
    })
  })
})
