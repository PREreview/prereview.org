import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType } from 'hyper-ts'
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
      test.prop([fc.connection(), fc.pageResponse(), fc.user(), fc.userOnboarding(), fc.html()])(
        'when there is a user',
        async (connection, response, user, userOnboarding, page) => {
          const getUserOnboarding = jest.fn<GetUserOnboardingEnv['getUserOnboarding']>(_ => TE.right(userOnboarding))
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({ response, user })({
              getUserOnboarding,
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
        },
      )

      test.prop([fc.connection(), fc.pageResponse(), fc.html()])(
        "when there isn't a user",
        async (connection, response, page) => {
          const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

          const actual = await runMiddleware(
            _.handleResponse({
              response,
              user: undefined,
            })({ getUserOnboarding: shouldNotBeCalled, templatePage }),
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
    ])('sets a canonical link', async (connection, response, user, userOnboarding, page) => {
      const actual = await runMiddleware(
        _.handleResponse({
          response,
          user,
        })({ getUserOnboarding: () => TE.right(userOnboarding), templatePage: () => page }),
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
  })
})
