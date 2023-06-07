import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/function'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/home'
import * as fc from './fc'
import { runMiddleware } from './middleware'

test.prop([
  fc.connection({ method: fc.requestMethod() }),
  fc.either(fc.constant('no-session' as const), fc.user()),
  fc.html(),
  fc.option(fc.constantFrom('logged-out' as const), { nil: undefined }),
])('home', async (connection, user, page, message) => {
  const templatePage = jest.fn(_ => page)
  const actual = await runMiddleware(
    _.home(message)({
      getRecentPrereviews: () => T.of([]),
      getUser: () => M.fromEither(user),
      publicUrl: new URL('http://example.com'),
      templatePage,
    }),
    connection,
  )()

  expect(actual).toStrictEqual(
    E.right([
      { type: 'setStatus', status: Status.OK },
      { type: 'setHeader', name: 'Link', value: '<http://example.com/>; rel="canonical"' },
      { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
      { type: 'setBody', body: page.toString() },
    ]),
  )
  expect(templatePage).toHaveBeenCalledWith(
    expect.objectContaining({
      current: 'home',
      title: 'PREreview',
      user: pipe(
        user,
        E.getOrElseW(() => undefined),
      ),
    }),
  )
})
