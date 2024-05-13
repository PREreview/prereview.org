import { test } from '@fast-check/jest'
import { expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import { rawHtml } from '../src/html'
import * as _ from '../src/middleware'
import type { TemplatePageEnv } from '../src/page'
import * as fc from './fc'
import { runMiddleware } from './middleware'

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
      title: expect.stringContaining('not found'),
      content: expect.stringContaining('not found'),
      skipLinks: [[rawHtml('Skip to main content'), '#main-content']],
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
      title: expect.stringContaining('having problems'),
      content: expect.stringContaining('having problems'),
      skipLinks: [[rawHtml('Skip to main content'), '#main-content']],
      user: E.isRight(user) ? user.right : undefined,
    })
  },
)
