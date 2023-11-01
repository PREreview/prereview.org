import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import type { GetPreprintEnv } from '../src/preprint'
import * as _ from '../src/preprint-reviews'
import { preprintReviewsMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('preprintReviews', () => {
  test.prop([
    fc.origin(),
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
  ])('when the reviews can be loaded', async (publicUrl, connection, user, preprint, prereviews, rapidPrereviews) => {
    const getPreprint = jest.fn<GetPreprintEnv['getPreprint']>(_ => TE.right(preprint))
    const getPrereviews = jest.fn<_.GetPrereviewsEnv['getPrereviews']>(_ => TE.right(prereviews))
    const getRapidPrereviews = jest.fn<_.GetRapidPrereviewsEnv['getRapidPrereviews']>(_ => TE.right(rapidPrereviews))

    const actual = await runMiddleware(
      _.preprintReviews(preprint.id)({
        getPreprint,
        getPrereviews,
        getRapidPrereviews,
        getUser: () => M.fromEither(user),
        publicUrl,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        {
          type: 'setHeader',
          name: 'Link',
          value: `<${publicUrl.href.slice(0, -1)}${format(preprintReviewsMatch.formatter, {
            id: preprint.id,
          })}>; rel="canonical"`,
        },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(getPreprint).toHaveBeenCalledWith(preprint.id)
    expect(getPrereviews).toHaveBeenCalledWith(preprint.id)
    expect(getRapidPrereviews).toHaveBeenCalledWith(preprint.id)
  })

  test.prop([
    fc.origin(),
    fc.connection(),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.indeterminatePreprintId(),
  ])('when the preprint is not found', async (publicUrl, connection, user, preprintId) => {
    const actual = await runMiddleware(
      _.preprintReviews(preprintId)({
        getPreprint: () => TE.left('not-found'),
        getPrereviews: shouldNotBeCalled,
        getRapidPrereviews: shouldNotBeCalled,
        getUser: () => M.fromEither(user),
        publicUrl,
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
  })

  test.prop([
    fc.origin(),
    fc.connection(),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.indeterminatePreprintId(),
  ])('when the preprint is unavailable', async (publicUrl, connection, user, preprintId) => {
    const actual = await runMiddleware(
      _.preprintReviews(preprintId)({
        getPreprint: () => TE.left('unavailable'),
        getPrereviews: shouldNotBeCalled,
        getRapidPrereviews: shouldNotBeCalled,
        getUser: () => M.fromEither(user),
        publicUrl,
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
    fc.origin(),
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
  ])('when the reviews cannot be loaded', async (publicUrl, connection, user, preprint, rapidPrereviews) => {
    const actual = await runMiddleware(
      _.preprintReviews(preprint.id)({
        getPreprint: () => TE.right(preprint),
        getPrereviews: () => TE.left('unavailable'),
        getRapidPrereviews: () => TE.right(rapidPrereviews),
        getUser: () => M.fromEither(user),
        publicUrl,
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
    fc.origin(),
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
  ])('when the rapid PREreviews cannot be loaded', async (publicUrl, connection, user, preprint, prereviews) => {
    const actual = await runMiddleware(
      _.preprintReviews(preprint.id)({
        getPreprint: () => TE.right(preprint),
        getPrereviews: () => TE.right(prereviews),
        getRapidPrereviews: () => TE.left('unavailable'),
        getUser: () => M.fromEither(user),
        publicUrl,
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
