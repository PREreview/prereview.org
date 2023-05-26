import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import type { GetPreprintEnv } from '../src/preprint'
import * as _ from '../src/preprint-reviews'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('preprintReviews', () => {
  test.prop([
    fc.connection(),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.preprint(),
    fc.array(
      fc.record({
        authors: fc.nonEmptyArray(
          fc.record(
            {
              name: fc.string(),
              orcid: fc.orcid(),
            },
            { requiredKeys: ['name'] },
          ),
        ),
        id: fc.integer(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        text: fc.html(),
      }),
    ),
    fc.array(
      fc.record({
        author: fc.record(
          {
            name: fc.string(),
            orcid: fc.orcid(),
          },
          { requiredKeys: ['name'] },
        ),
        questions: fc.record({
          availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
        }),
      }),
    ),
  ])('when the reviews can be loaded', async (connection, user, preprint, prereviews, rapidPrereviews) => {
    const getPreprint: Mock<GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))
    const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.right(prereviews))
    const getRapidPrereviews: Mock<_.GetRapidPrereviewsEnv['getRapidPrereviews']> = jest.fn(_ =>
      TE.right(rapidPrereviews),
    )

    const actual = await runMiddleware(
      _.preprintReviews(preprint.id)({
        getPreprint,
        getPrereviews,
        getRapidPrereviews,
        getUser: () => M.fromEither(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(getPreprint).toHaveBeenCalledWith(preprint.id)
    expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
    expect(getRapidPrereviews).toHaveBeenCalledWith(preprint.id)
  })

  test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.indeterminatePreprintId()])(
    'when the preprint is not found',
    async (connection, user, preprintId) => {
      const actual = await runMiddleware(
        _.preprintReviews(preprintId)({
          getPreprint: () => TE.left('not-found'),
          getPrereviews: () => () => Promise.reject('should not be called'),
          getRapidPrereviews: () => () => Promise.reject('should not be called'),
          getUser: () => M.fromEither(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user()), fc.indeterminatePreprintId()])(
    'when the preprint is unavailable',
    async (connection, user, preprintId) => {
      const actual = await runMiddleware(
        _.preprintReviews(preprintId)({
          getPreprint: () => TE.left('unavailable'),
          getPrereviews: () => () => Promise.reject('should not be called'),
          getRapidPrereviews: () => () => Promise.reject('should not be called'),
          getUser: () => M.fromEither(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([
    fc.connection(),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.preprint(),
    fc.array(
      fc.record({
        author: fc.record(
          {
            name: fc.string(),
            orcid: fc.orcid(),
          },
          { requiredKeys: ['name'] },
        ),
        questions: fc.record({
          availableCode: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          availableData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          coherent: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          ethics: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          future: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          limitations: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          methods: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          newData: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          novel: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          peerReview: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          recommend: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
          reproducibility: fc.constantFrom('yes' as const, 'unsure' as const, 'na' as const, 'no' as const),
        }),
      }),
    ),
  ])('when the reviews cannot be loaded', async (connection, user, preprint, rapidPrereviews) => {
    const actual = await runMiddleware(
      _.preprintReviews(preprint.id)({
        getPreprint: () => TE.right(preprint),
        getPrereviews: () => TE.left('unavailable'),
        getRapidPrereviews: () => TE.right(rapidPrereviews),
        getUser: () => M.fromEither(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([
    fc.connection(),

    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.preprint(),
    fc.array(
      fc.record({
        authors: fc.nonEmptyArray(
          fc.record(
            {
              name: fc.string(),
              orcid: fc.orcid(),
            },
            { requiredKeys: ['name'] },
          ),
        ),
        id: fc.integer(),
        language: fc.option(fc.languageCode(), { nil: undefined }),
        text: fc.html(),
      }),
    ),
  ])('when the rapid PREreviews cannot be loaded', async (connection, user, preprint, prereviews) => {
    const actual = await runMiddleware(
      _.preprintReviews(preprint.id)({
        getPreprint: () => TE.right(preprint),
        getPrereviews: () => TE.right(prereviews),
        getRapidPrereviews: () => TE.left('unavailable'),
        getUser: () => M.fromEither(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })
})
