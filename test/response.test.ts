import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
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
          fc.oauth(),
          fc.origin(),
        ])(
          'when there is a user',
          async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
            const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
            const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

            const actual = await runMiddleware(
              _.handleResponse({ locale, response, user })({
                getUserOnboarding,
                orcidOauth,
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
          },
        )

        test.prop([
          fc.connection(),
          fc.pageResponse({ status: fc.cacheableStatusCode() }),
          fc.supportedLocale(),
          fc.html(),
          fc.oauth(),
          fc.origin(),
        ])("when there isn't a user", async (connection, response, locale, page, orcidOauth, publicUrl) => {
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({
              locale,
              response,
              user: undefined,
            })({ getUserOnboarding: shouldNotBeCalled, orcidOauth, publicUrl, templatePage }),
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
        fc.oauth(),
        fc.origin(),
      ])(
        'with a non-cacheable response',
        async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
          const actual = await runMiddleware(
            _.handleResponse({ locale, response, user })({
              getUserOnboarding: () => TE.right(userOnboarding),
              orcidOauth,
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
      fc.oauth(),
      fc.origin(),
    ])(
      'sets a canonical link',
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding: () => TE.right(userOnboarding),
            orcidOauth,
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
      },
    )

    test.prop([
      fc.connection(),
      fc.pageResponse({ allowRobots: fc.constant(false) }),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      "doesn't allow robots",
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding: () => TE.right(userOnboarding),
            orcidOauth,
            publicUrl,
            templatePage: () => page,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right(expect.arrayContaining([{ type: 'setHeader', name: 'X-Robots-Tag', value: 'none, noarchive' }])),
        )
      },
    )
    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.pageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a flash message',
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding: () => TE.right(userOnboarding),
            orcidOauth,
            publicUrl,
            templatePage: () => page,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right(
            expect.arrayContaining([{ type: 'clearCookie', name: 'flash-message', options: { httpOnly: true } }]),
          ),
        )
      },
    )
  })

  describe('with a StreamlinePageResponse', () => {
    describe('templates the page', () => {
      describe('with a cacheable response', () => {
        test.prop([
          fc.connection(),
          fc.streamlinePageResponse({ status: fc.cacheableStatusCode() }),
          fc.user(),
          fc.supportedLocale(),
          fc.userOnboarding(),
          fc.html(),
          fc.oauth(),
          fc.origin(),
        ])(
          'when there is a user',
          async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
            const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
            const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

            const actual = await runMiddleware(
              _.handleResponse({ locale, response, user })({
                getUserOnboarding,
                orcidOauth,
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
              type: 'streamline',
              locale,
              user,
              userOnboarding,
            })
          },
        )

        test.prop([
          fc.connection(),
          fc.streamlinePageResponse({ status: fc.cacheableStatusCode() }),
          fc.supportedLocale(),
          fc.html(),
          fc.oauth(),
          fc.origin(),
        ])("when there isn't a user", async (connection, response, locale, page, orcidOauth, publicUrl) => {
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({ locale, response, user: undefined })({
              getUserOnboarding: shouldNotBeCalled,
              orcidOauth,
              publicUrl,
              templatePage,
            }),
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
            type: 'streamline',
            locale,
            user: undefined,
            userOnboarding: undefined,
          })
        })
      })

      test.prop([
        fc.connection(),
        fc.streamlinePageResponse({ status: fc.nonCacheableStatusCode() }),
        fc.option(fc.user(), { nil: undefined }),
        fc.supportedLocale(),
        fc.userOnboarding(),
        fc.html(),
        fc.oauth(),
        fc.origin(),
      ])(
        'with a non-cacheable response',
        async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
          const actual = await runMiddleware(
            _.handleResponse({ locale, response, user })({
              getUserOnboarding: () => TE.right(userOnboarding),
              orcidOauth,
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
      fc.streamlinePageResponse({ canonical: fc.lorem() }),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'sets a canonical link',
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({
            locale,
            response,
            user,
          })({ getUserOnboarding: () => TE.right(userOnboarding), orcidOauth, publicUrl, templatePage: () => page }),
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
      },
    )

    test.prop([
      fc.connection(),
      fc.streamlinePageResponse({ allowRobots: fc.constant(false) }),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      "doesn't allow robots",
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding: () => TE.right(userOnboarding),
            orcidOauth,
            publicUrl,
            templatePage: () => page,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right(expect.arrayContaining([{ type: 'setHeader', name: 'X-Robots-Tag', value: 'none, noarchive' }])),
        )
      },
    )

    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.streamlinePageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a flash message',
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding: () => TE.right(userOnboarding),
            orcidOauth,
            publicUrl,
            templatePage: () => page,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right(
            expect.arrayContaining([{ type: 'clearCookie', name: 'flash-message', options: { httpOnly: true } }]),
          ),
        )
      },
    )
  })

  describe('with a TwoUpPageResponse', () => {
    test.prop([
      fc.connection(),
      fc.twoUpPageResponse(),
      fc.user(),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a user',
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding,
            orcidOauth,
            publicUrl,
            templatePage,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, private' },
            { type: 'setHeader', name: 'Vary', value: 'Cookie' },
            {
              type: 'setHeader',
              name: 'Link',
              value: `<${encodeURI(`${publicUrl.origin}${response.canonical}`)}>; rel="canonical"`,
            },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: page.toString() },
          ]),
        )
        expect(getUserOnboarding).toHaveBeenCalledWith(user.orcid)
        expect(templatePage).toHaveBeenCalledWith({
          title: response.title,
          description: response.description,
          content: expect.htmlContaining(response.main),
          skipLinks: [
            [expect.anything(), '#preprint-details'],
            [expect.anything(), '#prereviews'],
          ],
          js: [],
          type: 'two-up',
          locale,
          user,
          userOnboarding,
        })
      },
    )

    test.prop([fc.connection(), fc.twoUpPageResponse(), fc.supportedLocale(), fc.html(), fc.oauth(), fc.origin()])(
      "when there isn't a user",
      async (connection, response, locale, page, orcidOauth, publicUrl) => {
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user: undefined })({
            getUserOnboarding: shouldNotBeCalled,
            orcidOauth,
            publicUrl,
            templatePage,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, public' },
            { type: 'setHeader', name: 'Vary', value: 'Cookie' },
            {
              type: 'setHeader',
              name: 'Link',
              value: `<${encodeURI(`${publicUrl.origin}${response.canonical}`)}>; rel="canonical"`,
            },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: page.toString() },
          ]),
        )
        expect(templatePage).toHaveBeenCalledWith({
          title: response.title,
          description: response.description,
          content: expect.htmlContaining(response.main),
          skipLinks: [
            [expect.anything(), '#preprint-details'],
            [expect.anything(), '#prereviews'],
          ],
          js: [],
          type: 'two-up',
          locale,
          user: undefined,
          userOnboarding: undefined,
        })
      },
    )

    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.twoUpPageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.supportedLocale(),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a flash message',
      async (connection, response, user, locale, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({ locale, response, user })({
            getUserOnboarding: () => TE.right(userOnboarding),
            orcidOauth,
            publicUrl,
            templatePage: () => page,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right(
            expect.arrayContaining([{ type: 'clearCookie', name: 'flash-message', options: { httpOnly: true } }]),
          ),
        )
      },
    )
  })

  test.prop([
    fc.connection(),
    fc.redirectResponse(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
  ])('with a RedirectResponse', async (connection, response, user, locale, orcidOauth, publicUrl) => {
    const actual = await runMiddleware(
      _.handleResponse({ locale, response, user })({
        getUserOnboarding: shouldNotBeCalled,
        orcidOauth,
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

  test.prop([
    fc.connection(),
    fc.flashMessageResponse(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
  ])('with a FlashMessageResponse', async (connection, response, user, locale, orcidOauth, publicUrl) => {
    const actual = await runMiddleware(
      _.handleResponse({ locale, response, user })({
        getUserOnboarding: shouldNotBeCalled,
        orcidOauth,
        publicUrl,
        templatePage: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right(
        expect.arrayContaining([
          { type: 'setStatus', status: Status.SeeOther },
          { type: 'setHeader', name: 'Location', value: response.location },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: response.message },
          { type: 'endResponse' },
        ]),
      ),
    )
  })

  test.prop([
    fc.connection(),
    fc.logInResponse(),
    fc.option(fc.user(), { nil: undefined }),
    fc.supportedLocale(),
    fc.oauth(),
    fc.origin(),
  ])('with a LogInResponse', async (connection, response, user, locale, orcidOauth, publicUrl) => {
    const actual = await runMiddleware(
      _.handleResponse({ locale, response, user })({
        getUserOnboarding: shouldNotBeCalled,
        orcidOauth,
        publicUrl,
        templatePage: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right(
        expect.arrayContaining([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: orcidOauth.clientId,
                response_type: 'code',
                redirect_uri: new URL('/orcid', publicUrl).toString(),
                scope: '/authenticate',
                state: new URL(`${publicUrl.origin}${response.location}`).href,
              }).toString()}`,
              orcidOauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      ),
    )
  })
})
