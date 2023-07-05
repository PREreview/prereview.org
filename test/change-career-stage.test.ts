import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/change-career-stage'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('changeCareerStage', () => {
  test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user())])(
    'when profiles can be edited',
    async (connection, user) => {
      const actual = await runMiddleware(
        _.changeCareerStage({ canEditProfile: true, getUser: () => M.fromEither(user) }),
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

  test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user())])(
    "when profiles can't be edited",
    async (connection, user) => {
      const actual = await runMiddleware(
        _.changeCareerStage({ canEditProfile: false, getUser: () => M.fromEither(user) }),
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
})
