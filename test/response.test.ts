import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { MediaType } from 'hyper-ts'
import { rawHtml } from '../src/html'
import type { TemplatePageEnv } from '../src/page'
import * as _ from '../src/response'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('handleResponse', () => {
  describe('with a PageResponse', () => {
    test.prop([fc.connection(), fc.pageResponse(), fc.option(fc.user(), { nil: undefined }), fc.html()])(
      'templates the page',
      async (connection, response, user, page) => {
        const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

        const actual = await runMiddleware(_.handleResponse({ response, user })({ templatePage }), connection)()

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
          user,
        })
      },
    )

    test.prop([
      fc.connection(),
      fc.pageResponse({ canonical: fc.lorem() }),
      fc.option(fc.user(), { nil: undefined }),
      fc.html(),
    ])('sets a canonical link', async (connection, response, user, page) => {
      const actual = await runMiddleware(
        _.handleResponse({
          response,
          user,
        })({ templatePage: () => page }),
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
