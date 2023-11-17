import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Task'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../src/home'
import * as fc from './fc'
import { runMiddleware } from './middleware'

test.prop([fc.connection({ method: fc.requestMethod() }), fc.user(), fc.html()])(
  'home',
  async (connection, user, page) => {
    const templatePage = jest.fn(_ => page)
    const actual = await runMiddleware(
      _.home({
        getRecentPrereviews: () => T.of([]),
        getUser: () => M.right(user),
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
        title: 'PREreview: Open preprint reviews. For all researchers.',
        user,
      }),
    )
  },
)
