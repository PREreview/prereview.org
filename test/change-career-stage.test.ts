import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/change-career-stage'
import * as fc from './fc'
import { runMiddleware } from './middleware'

test.prop([fc.connection(), fc.either(fc.constant('no-session' as const), fc.user())])(
  'changeCareerStage',
  async (connection, user) => {
    const actual = await runMiddleware(_.changeCareerStage({ getUser: () => M.fromEither(user) }), connection)()

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
