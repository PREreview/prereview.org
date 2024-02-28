import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import { rawHtml } from '../src/html'
import type { TemplatePageEnv } from '../src/page'
import * as _ from '../src/response'
import type { GetUserOnboardingEnv } from '../src/user-onboarding'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('handleResponse', () => {
  describe('with a PageResponse', () => {
    describe('templates the page', () => {
      test.prop([
        fc.connection(),
        fc.pageResponse(),
        fc.user(),
        fc.userOnboarding(),
        fc.html(),
        fc.oauth(),
        fc.origin(),
      ])('when there is a user', async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
        const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.handleResponse({ response, user })({
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
              { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
              { type: 'setBody', body: page.toString() },
            ]),
          ),
        )
        expect(getUserOnboarding).toHaveBeenCalledWith(user.orcid)
        expect(templatePage).toHaveBeenCalledWith({
          title: response.title,
          content: expect.stringContaining(response.main.toString()),
          skipLinks: [[rawHtml('Skip to main content'), '#main']],
          current: response.current,
          js: response.js,
          user,
          userOnboarding,
        })
      })

      test.prop([fc.connection(), fc.pageResponse(), fc.html(), fc.oauth(), fc.origin()])(
        "when there isn't a user",
        async (connection, response, page, orcidOauth, publicUrl) => {
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({
              response,
              user: undefined,
            })({ getUserOnboarding: shouldNotBeCalled, orcidOauth, publicUrl, templatePage }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right(
              expect.arrayContaining([
                { type: 'setStatus', status: response.status },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: page.toString() },
              ]),
            ),
          )
          expect(templatePage).toHaveBeenCalledWith({
            title: response.title,
            content: expect.stringContaining(response.main.toString()),
            skipLinks: [[rawHtml('Skip to main content'), '#main']],
            current: response.current,
            js: response.js,
            user: undefined,
            userOnboarding: undefined,
          })
        },
      )
    })

    test.prop([
      fc.connection(),
      fc.pageResponse({ canonical: fc.lorem() }),
      fc.option(fc.user(), { nil: undefined }),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])('sets a canonical link', async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
      const actual = await runMiddleware(
        _.handleResponse({
          response,
          user,
        })({ getUserOnboarding: () => TE.right(userOnboarding), orcidOauth, publicUrl, templatePage: () => page }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right(
          expect.arrayContaining([
            { type: 'setHeader', name: 'Link', value: `<${response.canonical}>; rel="canonical"` },
          ]),
        ),
      )
    })

    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.pageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a flash message',
      async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({
            response,
            user,
          })({ getUserOnboarding: () => TE.right(userOnboarding), orcidOauth, publicUrl, templatePage: () => page }),
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
      test.prop([
        fc.connection(),
        fc.streamlinePageResponse(),
        fc.user(),
        fc.userOnboarding(),
        fc.html(),
        fc.oauth(),
        fc.origin(),
      ])('when there is a user', async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
        const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.handleResponse({ response, user })({
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
              { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
              { type: 'setBody', body: page.toString() },
            ]),
          ),
        )
        expect(getUserOnboarding).toHaveBeenCalledWith(user.orcid)
        expect(templatePage).toHaveBeenCalledWith({
          title: response.title,
          content: expect.stringContaining(response.main.toString()),
          skipLinks: [[rawHtml('Skip to main content'), '#main']],
          current: response.current,
          js: response.js,
          type: 'streamline',
          user,
          userOnboarding,
        })
      })

      test.prop([fc.connection(), fc.streamlinePageResponse(), fc.html(), fc.oauth(), fc.origin()])(
        "when there isn't a user",
        async (connection, response, page, orcidOauth, publicUrl) => {
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({
              response,
              user: undefined,
            })({ getUserOnboarding: shouldNotBeCalled, orcidOauth, publicUrl, templatePage }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right(
              expect.arrayContaining([
                { type: 'setStatus', status: response.status },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: page.toString() },
              ]),
            ),
          )
          expect(templatePage).toHaveBeenCalledWith({
            title: response.title,
            content: expect.stringContaining(response.main.toString()),
            skipLinks: [[rawHtml('Skip to main content'), '#main']],
            current: response.current,
            js: response.js,
            type: 'streamline',
            user: undefined,
            userOnboarding: undefined,
          })
        },
      )
    })

    test.prop([
      fc.connection(),
      fc.streamlinePageResponse({ canonical: fc.lorem() }),
      fc.option(fc.user(), { nil: undefined }),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])('sets a canonical link', async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
      const actual = await runMiddleware(
        _.handleResponse({
          response,
          user,
        })({ getUserOnboarding: () => TE.right(userOnboarding), orcidOauth, publicUrl, templatePage: () => page }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right(
          expect.arrayContaining([
            { type: 'setHeader', name: 'Link', value: `<${response.canonical}>; rel="canonical"` },
          ]),
        ),
      )
    })

    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.streamlinePageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a flash message',
      async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({
            response,
            user,
          })({ getUserOnboarding: () => TE.right(userOnboarding), orcidOauth, publicUrl, templatePage: () => page }),
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
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])('when there is a user', async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
      const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.handleResponse({ response, user })({
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
          { type: 'setHeader', name: 'Link', value: `<${response.canonical}>; rel="canonical"` },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(getUserOnboarding).toHaveBeenCalledWith(user.orcid)
      expect(templatePage).toHaveBeenCalledWith({
        title: response.title,
        description: response.description,
        content: expect.stringContaining(response.main.toString()),
        skipLinks: [
          [rawHtml('Skip to preprint details'), '#preprint-details'],
          [rawHtml('Skip to PREreviews'), '#prereviews'],
        ],
        js: [],
        type: 'two-up',
        user,
        userOnboarding,
      })
    })

    test.prop([fc.connection(), fc.twoUpPageResponse(), fc.html(), fc.oauth(), fc.origin()])(
      "when there isn't a user",
      async (connection, response, page, orcidOauth, publicUrl) => {
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(
          _.handleResponse({
            response,
            user: undefined,
          })({ getUserOnboarding: shouldNotBeCalled, orcidOauth, publicUrl, templatePage }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.OK },
            { type: 'setHeader', name: 'Link', value: `<${response.canonical}>; rel="canonical"` },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: page.toString() },
          ]),
        )
        expect(templatePage).toHaveBeenCalledWith({
          title: response.title,
          description: response.description,
          content: expect.stringContaining(response.main.toString()),
          skipLinks: [
            [rawHtml('Skip to preprint details'), '#preprint-details'],
            [rawHtml('Skip to PREreviews'), '#prereviews'],
          ],
          js: [],
          type: 'two-up',
          user: undefined,
          userOnboarding: undefined,
        })
      },
    )

    test.prop([
      fc.string().chain(message => fc.connection({ headers: fc.constant({ Cookie: `flash-message=${message}` }) })),
      fc.twoUpPageResponse(),
      fc.option(fc.user(), { nil: undefined }),
      fc.userOnboarding(),
      fc.html(),
      fc.oauth(),
      fc.origin(),
    ])(
      'when there is a flash message',
      async (connection, response, user, userOnboarding, page, orcidOauth, publicUrl) => {
        const actual = await runMiddleware(
          _.handleResponse({
            response,
            user,
          })({ getUserOnboarding: () => TE.right(userOnboarding), orcidOauth, publicUrl, templatePage: () => page }),
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
    fc.oauth(),
    fc.origin(),
  ])('with a RedirectResponse', async (connection, response, user, orcidOauth, publicUrl) => {
    const actual = await runMiddleware(
      _.handleResponse({ response, user })({
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
    fc.oauth(),
    fc.origin(),
  ])('with a FlashMessageResponse', async (connection, response, user, orcidOauth, publicUrl) => {
    const actual = await runMiddleware(
      _.handleResponse({ response, user })({
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

  test.prop([fc.connection(), fc.logInResponse(), fc.option(fc.user(), { nil: undefined }), fc.oauth(), fc.origin()])(
    'with a LogInResponse',
    async (connection, response, user, orcidOauth, publicUrl) => {
      const actual = await runMiddleware(
        _.handleResponse({ response, user })({
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
                  state: new URL(response.location, publicUrl).href,
                }).toString()}`,
                orcidOauth.authorizeUrl,
              ).href,
            },
            { type: 'endResponse' },
          ]),
        ),
      )
    },
  )
})
