import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../src/clubs.js'
import { clubsMatch } from '../src/routes.js'
import * as fc from './fc.js'

describe('clubs', () => {
  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('when the page can be loaded', async key => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec',
        query: { key },
      },
      { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
    )

    const actual = await _.clubs({ fetch, ghostApi: { key } })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(clubsMatch.formatter, {}),
      current: 'clubs',
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
          url: 'begin:https://content.prereview.org/ghost/api/content/pages/64637b4c07fb34a92c7f84ec?',
          query: { key },
        },
        response,
      )

      const actual = await _.clubs({ fetch, ghostApi: { key } })()

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
