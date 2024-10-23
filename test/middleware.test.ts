import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import * as _ from '../src/middleware.js'
import type { TemplatePageEnv } from '../src/page.js'
import * as fc from './fc.js'
import { runMiddleware } from './middleware.js'

test.prop([fc.connection(), fc.cookieName(), fc.string()])('seeOther', async (connection, location) => {
  const actual = await runMiddleware(_.seeOther(location), connection)()

  expect(actual).toStrictEqual(
    E.right([
      { type: 'setStatus', status: Status.SeeOther },
      { type: 'setHeader', name: 'Location', value: location },
      { type: 'endResponse' },
    ]),
  )
})

test.prop([fc.connection(), fc.string()])('movedPermanently', async (connection, location) => {
  const actual = await runMiddleware(_.movedPermanently(location), connection)()

  expect(actual).toStrictEqual(
    E.right([
      { type: 'setStatus', status: Status.MovedPermanently },
      { type: 'setHeader', name: 'Location', value: location },
      { type: 'endResponse' },
    ]),
  )
})

test.prop([fc.connection(), fc.either(fc.constant('no-session'), fc.user()), fc.html()])(
  'notFound',
  async (connection, user, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(_.notFound({ getUser: () => M.fromEither(user), templatePage }), connection)()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: page.toString() },
      ]),
    )
    expect(templatePage).toHaveBeenCalledWith({
      title: expect.anything(),
      content: expect.anything(),
      skipLinks: [[expect.anything(), '#main-content']],
      user: E.isRight(user) ? user.right : undefined,
    })
  },
)

test.prop([fc.connection(), fc.either(fc.constant('no-session'), fc.user()), fc.html()])(
  'serviceUnavailable',
  async (connection, user, page) => {
    const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

    const actual = await runMiddleware(
      _.serviceUnavailable({ getUser: () => M.fromEither(user), templatePage }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: page.toString() },
      ]),
    )
    expect(templatePage).toHaveBeenCalledWith({
      title: expect.anything(),
      content: expect.anything(),
      skipLinks: [[expect.anything(), '#main-content']],
      user: E.isRight(user) ? user.right : undefined,
    })
  },
)
