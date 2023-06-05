import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Task'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/home'
import * as fc from './fc'
import { runMiddleware } from './middleware'

test.prop([fc.connection({ method: fc.requestMethod() }), fc.either(fc.constant('no-session' as const), fc.user())])(
  'home',
  async (connection, user) => {
    const actual = await runMiddleware(
      _.home({
        getRecentPrereviews: () => T.of([]),
        getUser: () => M.fromEither(user),
        publicUrl: new URL('http://example.com'),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Link', value: '<http://example.com/>; rel="canonical"' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  },
)
