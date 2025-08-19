import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType } from 'hyper-ts'
import type { TemplatePageEnv } from '../src/page.js'
import * as _ from '../src/response.js'
import type { GetUserOnboardingEnv } from '../src/user-onboarding.js'
import * as fc from './fc.js'
import { runMiddleware } from './middleware.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('handleResponse', () => {
  describe('with a PageResponse', () => {
    describe('templates the page', () => {
      describe('with a cacheable response', () => {
        test.prop([
          fc.connection(),
          fc.pageResponse({ status: fc.cacheableStatusCode() }),
          fc.user(),
          fc.supportedLocale(),
          fc.userOnboarding(),
          fc.html(),
          fc.origin(),
        ])('when there is a user', async (connection, response, user, locale, userOnboarding, page, publicUrl) => {
          const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({ locale, response, user })({
              getUserOnboarding,
              publicUrl,
              templatePage,
            }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right(
              expect.arrayContaining([
                { type: 'setStatus', status: response.status },
                { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, private' },
                { type: 'setHeader', name: 'Vary', value: 'Cookie' },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: page.toString() },
              ]),
            ),
          )
          expect(getUserOnboarding).toHaveBeenCalledWith(user.orcid)
          expect(templatePage).toHaveBeenCalledWith({
            title: response.title,
            description: response.description,
            content: expect.htmlContaining(response.main),
            skipLinks: [[expect.anything(), '#main']],
            current: response.current,
            js: response.js,
            locale,
            user,
            userOnboarding,
          })
        })

        test.prop([
          fc.connection(),
          fc.pageResponse({ status: fc.cacheableStatusCode() }),
          fc.supportedLocale(),
          fc.html(),
          fc.origin(),
        ])("when there isn't a user", async (connection, response, locale, page, publicUrl) => {
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({
              locale,
              response,
              user: undefined,
            })({ getUserOnboarding: shouldNotBeCalled, publicUrl, templatePage }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right(
              expect.arrayContaining([
                { type: 'setStatus', status: response.status },
                { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, public' },
                { type: 'setHeader', name: 'Vary', value: 'Cookie' },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: page.toString() },
              ]),
            ),
          )
          expect(templatePage).toHaveBeenCalledWith({
            title: response.title,
            description: response.description,
            content: expect.htmlContaining(response.main),
            skipLinks: [[expect.anything(), '#main']],
            current: response.current,
            js: response.js,
            locale,
            user: undefined,
            userOnboarding: undefined,
          })
        })
      })

      test.prop([
        fc.connection(),
        fc.pageResponse({ status: fc.nonCacheableStatusCode() }),
        fc.option(fc.user(), { nil: undefined }),
        fc.supportedLocale(),
        fc.userOnboarding(),
        fc.html(),
        fc.origin(),
      ])(
        'with a non-cacheable response',
        async (connection, response, user, locale, userOnboarding, page, publicUrl) => {
          const actual = await runMiddleware(
            _.handleResponse({ locale, response, user })({
              getUserOnboarding: () => TE.right(userOnboarding),
              publicUrl,
              templatePage: () => page,
            }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right(
              expect.arrayContaining([
                { type: 'setStatus', status: response.status },
                { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: page.toString() },
              ]),
            ),
          )
        },
      )
    })

    test.prop([
      fc.connection(),
      fc.pageResponse({ canonical: fc.lorem() }),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.origin(),
    ])('sets a canonical link', async (connection, response, user, locale, userOnboarding, page, publicUrl) => {
      const actual = await runMiddleware(
        _.handleResponse({ locale, response, user })({
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          templatePage: () => page,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right(
          expect.arrayContaining([
            {
              type: 'setHeader',
              name: 'Link',
              value: `<${encodeURI(`${publicUrl.origin}/${response.canonical}`)}>; rel="canonical"`,
            },
          ]),
        ),
      )
    })

    test.prop([
      fc.connection(),
      fc.pageResponse({ allowRobots: fc.constant(false) }),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.origin(),
    ])("doesn't allow robots", async (connection, response, user, locale, userOnboarding, page, publicUrl) => {
      const actual = await runMiddleware(
        _.handleResponse({ locale, response, user })({
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          templatePage: () => page,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right(expect.arrayContaining([{ type: 'setHeader', name: 'X-Robots-Tag', value: 'none, noarchive' }])),
      )
    })
    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.pageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.origin(),
    ])('when there is a flash message', async (connection, response, user, locale, userOnboarding, page, publicUrl) => {
      const actual = await runMiddleware(
        _.handleResponse({ locale, response, user })({
          getUserOnboarding: () => TE.right(userOnboarding),
          publicUrl,
          templatePage: () => page,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right(expect.arrayContaining([{ type: 'clearCookie', name: 'flash-message', options: { httpOnly: true } }])),
      )
    })
  })

  test.prop([
    fc.connection(),
    fc.redirectResponse(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.origin(),
  ])('with a RedirectResponse', async (connection, response, user, locale, publicUrl) => {
    const actual = await runMiddleware(
      _.handleResponse({ locale, response, user })({
        getUserOnboarding: shouldNotBeCalled,
        publicUrl,
        templatePage: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right(
        expect.arrayContaining([
          { type: 'setStatus', status: response.status },
          { type: 'setHeader', name: 'Location', value: response.location.toString() },
          { type: 'endResponse' },
        ]),
      ),
    )
  })
})
