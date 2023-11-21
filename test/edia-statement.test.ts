import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../src/edia-statement'
import { ediaStatementMatch } from '../src/routes'
import * as fc from './fc'

describe('ediaStatement', () => {
  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 })])('when the page can be loaded', async key => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17',
        query: { key },
      },
      { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
    )

    const actual = await _.ediaStatement({ fetch, ghostApi: { key } })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(ediaStatementMatch.formatter, {}),
      current: 'edia-statement',
      status: Status.OK,
      title: expect.stringContaining('Statement'),
      main: expect.stringContaining('<p>Foo</p>'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.fetchResponse()])(
    'when the page cannot be loaded',
    async (key, response) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb17?',
          query: { key },
        },
        response,
      )

      const actual = await _.ediaStatement({ fetch, ghostApi: { key } })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(fetch.done()).toBeTruthy()
    },
  )
})
