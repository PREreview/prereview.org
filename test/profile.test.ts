import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Task'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/profile'
import * as fc from './fc'
import { runMiddleware } from './middleware'

test.prop([
  fc.connection({ method: fc.requestMethod() }),
  fc.string(),
  fc.nonEmptyArray(
    fc.record({
      id: fc.integer(),
      reviewers: fc.nonEmptyArray(fc.string()),
      published: fc.plainDate(),
      preprint: fc.preprintTitle(),
    }),
  ),
  fc.either(fc.constant('no-session' as const), fc.user()),
])('profile', async (connection, name, prereviews, user) => {
  const actual = await runMiddleware(
    _.profile({
      getName: () => T.of(name),
      getPrereviews: () => T.of(prereviews),
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
})
