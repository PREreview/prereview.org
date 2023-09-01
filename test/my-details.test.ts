import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/my-details'
import { myDetailsMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('myDetails', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
      fc.either(fc.constant('not-found' as const), fc.nonEmptyString()),
    ])('when the details can be loaded', async (oauth, publicUrl, connection, user, careerStage, researchInterests) => {
      const actual = await runMiddleware(
        _.myDetails({
          getUser: () => M.right(user),
          oauth,
          publicUrl,
          getCareerStage: () => TE.fromEither(careerStage),
          getResearchInterests: () => TE.fromEither(researchInterests),
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
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.nonEmptyString()),
    ])('when the career stage cannot be loaded', async (oauth, publicUrl, connection, user, researchInterests) => {
      const actual = await runMiddleware(
        _.myDetails({
          getUser: () => M.right(user),
          oauth,
          publicUrl,
          getCareerStage: () => TE.left('unavailable'),
          getResearchInterests: () => TE.fromEither(researchInterests),
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

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.careerStage()),
    ])('when the career stage cannot be loaded', async (oauth, publicUrl, connection, user, careerStage) => {
      const actual = await runMiddleware(
        _.myDetails({
          getUser: () => M.right(user),
          oauth,
          publicUrl,
          getCareerStage: () => TE.fromEither(careerStage),
          getResearchInterests: () => TE.left('unavailable'),
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

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() })])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.myDetails({
          getUser: () => M.left('no-session'),
          oauth,
          publicUrl,
          getCareerStage: shouldNotBeCalled,
          getResearchInterests: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: oauth.clientId,
                response_type: 'code',
                redirect_uri: oauth.redirectUri.href,
                scope: '/authenticate',
                state: new URL(format(myDetailsMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.myDetails({
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          getCareerStage: shouldNotBeCalled,
          getResearchInterests: shouldNotBeCalled,
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
    },
  )
})
