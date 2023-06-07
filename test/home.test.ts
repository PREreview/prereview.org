import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Task'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as _ from '../src/home'
import { homeMatch } from '../src/routes'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { format , format } from 'fp-ts-routing'


describe('home', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.user(),
      fc.html(),
      fc.option(fc.constantFrom('logged-in' as const), { nil: undefined }),
    ])('when the message is ok', async (connection, user, page, message) => {
      const templatePage = jest.fn(_ => page)
      const actual = await runMiddleware(
        _.home(message)({
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
          title: 'PREreview',
          user,
        }),
      )
    })

    test.prop([fc.connection({ method: fc.requestMethod() }), fc.user()])(
      "when the message is 'logged-out'",
      async (connection, user) => {
        const actual = await runMiddleware(
          _.home('logged-out')({
            getRecentPrereviews: () => () => Promise.reject('should not be called'),
            getUser: () => M.right(user),
            publicUrl: new URL('http://example.com'),
            templatePage: () => {
              throw 'should not be called'
            },
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            { type: 'setHeader', name: 'Location', value: format(homeMatch.formatter, {}) },
            { type: 'endResponse' },
          ]),
        )
      },
    )
  })

  describe('when the user is logged out', () => {
    test.prop([
      fc.connection({ method: fc.requestMethod() }),
      fc.html(),
      fc.option(fc.constantFrom('logged-out' as const), { nil: undefined }),
    ])('when the message is ok', async (connection, page, message) => {
      const templatePage = jest.fn(_ => page)
      const actual = await runMiddleware(
        _.home(message)({
          getRecentPrereviews: () => T.of([]),
          getUser: () => M.left('no-session'),
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
          user: undefined,
        }),
      )
    })

    test.prop([fc.connection({ method: fc.requestMethod() })])("when the message is 'logged-in'", async connection => {
      const actual = await runMiddleware(
        _.home('logged-in')({
          getRecentPrereviews: () => () => Promise.reject('should not be called'),
          getUser: () => M.left('no-session'),
          publicUrl: new URL('http://example.com'),
          templatePage: () => {
            throw 'should not be called'
          },
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          { type: 'setHeader', name: 'Location', value: format(homeMatch.formatter, {}) },
          { type: 'endResponse' },
        ]),
      )
    })
  })
})
