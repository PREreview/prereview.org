import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../src/how-to-use.js'
import { howToUseMatch } from '../src/routes.js'
import * as fc from './fc.js'

describe('howToUse', () => {
  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('when the page can be loaded', async key => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'https://content.prereview.org/ghost/api/content/pages/651d895e07fb34a92c7f8d28',
        query: { key },
      },
      { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
    )

    const actual = await _.howToUse({ fetch, ghostApi: { key } })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(howToUseMatch.formatter, {}),
      current: 'how-to-use',
      status: Status.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.fetchResponse()])(
    'when the page cannot be loaded',
    async (key, response) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://content.prereview.org/ghost/api/content/pages/651d895e07fb34a92c7f8d28?',
          query: { key },
        },
        response,
      )

      const actual = await _.howToUse({ fetch, ghostApi: { key } })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(fetch.done()).toBeTruthy()
    },
  )
})
