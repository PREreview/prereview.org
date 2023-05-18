import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/funding'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('funding', () => {
  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the page can be loaded', async (connection, key, user) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb12',
        query: { key },
      },
      { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
    )

    const actual = await runMiddleware(
      _.funding({
        fetch,
        ghostApi: { key },
        getUser: () => M.fromEither(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.stringContaining('<p>Foo</p>') },
      ]),
    )
  })

  test.prop([
    fc.connection({ method: fc.requestMethod() }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.fetchResponse(),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the page cannot be loaded', async (connection, key, response, user) => {
    const actual = await runMiddleware(
      _.funding({
        fetch: fetchMock
          .sandbox()
          .getOnce(
            { url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb12', query: { key } },
            response,
          ),
        ghostApi: { key },
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
