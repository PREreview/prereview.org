import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/club'
import * as fc from './fc'
import { runMiddleware } from './middleware'

test.prop([
  fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
  fc.either(fc.constant('no-session' as const), fc.user()),
])('club', async (connection, user) => {
  const actual = await runMiddleware(_.club({ getUser: () => M.fromEither(user) }), connection)()

  expect(actual).toStrictEqual(
    E.right([
      { type: 'setStatus', status: Status.NotFound },
      { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
      { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
      { type: 'setBody', body: expect.anything() },
    ]),
  )
})
