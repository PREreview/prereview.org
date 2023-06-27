import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/reviews'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('reviews', () => {
  test.prop([
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.record({
      currentPage: fc.integer(),
      totalPages: fc.integer(),
      recentPrereviews: fc.nonEmptyArray(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.boolean(),
  ])('when the recent reviews can be loaded', async (page, connection, recentPrereviews, user, canSeeClubs) => {
    const getRecentPrereviews: Mock<_.GetRecentPrereviewsEnv['getRecentPrereviews']> = jest.fn(_ =>
      TE.right(recentPrereviews),
    )

    const actual = await runMiddleware(
      _.reviews(page)({
        canSeeClubs,
        getRecentPrereviews,
        getUser: () => M.fromEither(user),
        publicUrl: new URL('http://example.com'),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Link', value: `<http://example.com/reviews?page=${page}>; rel="canonical"` },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
    expect(getRecentPrereviews).toHaveBeenCalledWith(page)
  })

  test.prop([
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.boolean(),
  ])('when the page is not found', async (page, connection, user, canSeeClubs) => {
    const actual = await runMiddleware(
      _.reviews(page)({
        canSeeClubs,
        getRecentPrereviews: () => TE.left('not-found'),
        getUser: () => M.fromEither(user),
        publicUrl: new URL('http://example.com'),
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
    fc.integer(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.boolean(),
  ])('when the recent reviews cannot be loaded', async (page, connection, user, canSeeClubs) => {
    const actual = await runMiddleware(
      _.reviews(page)({
        canSeeClubs,
        getRecentPrereviews: () => TE.left('unavailable'),
        getUser: () => M.fromEither(user),
        publicUrl: new URL('http://example.com'),
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
