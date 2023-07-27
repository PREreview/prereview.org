import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import * as _ from '../src/club'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('club', () => {
  describe('when clubs can be seen', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.clubId(),
      fc.array(
        fc.record({
          id: fc.integer(),
          reviewers: fc.nonEmptyArray(fc.string()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    ])('when the data can be loaded', async (connection, user, clubId, prereviews) => {
      const getPrereviews: Mock<_.GetPrereviewsEnv['getPrereviews']> = jest.fn(_ => TE.right(prereviews))

      const actual = await runMiddleware(
        _.club(clubId)({
          canSeeClubs: true,
          getPrereviews,
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
      expect(getPrereviews).toHaveBeenCalledWith(clubId)
    })

    test.prop([
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.either(fc.constant('no-session' as const), fc.user()),
      fc.clubId(),
    ])('when the PREreviews are unavailable', async (connection, user, clubId) => {
      const actual = await runMiddleware(
        _.club(clubId)({
          canSeeClubs: true,
          getPrereviews: () => TE.left('unavailable'),
          getUser: () => M.fromEither(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })

  test.prop([
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
    fc.clubId(),
  ])("when clubs can't be seen", async (connection, user, clubId) => {
    const actual = await runMiddleware(
      _.club(clubId)({
        canSeeClubs: false,
        getPrereviews: shouldNotBeCalled,
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
  })
})
