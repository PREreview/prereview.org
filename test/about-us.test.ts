import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../src/about-us.js'
import { aboutUsMatch } from '../src/routes.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('aboutUs', () => {
  test.prop([fc.supportedLocale(), fc.string({ unit: fc.alphanumeric(), minLength: 1 })])(
    'when the page can be loaded',
    async (locale, key) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14',
          query: { key },
        },
        { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
      )

      const actual = await _.aboutUs(locale)({ fetch, ghostApi: { key }, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(aboutUsMatch.formatter, {}),
        current: 'about-us',
        status: Status.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.supportedLocale(), fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.fetchResponse()])(
    'when the page cannot be loaded',
    async (locale, key, response) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14?',
          query: { key },
        },
        response,
      )

      const actual = await _.aboutUs(locale)({ fetch, ghostApi: { key }, sleep: shouldNotBeCalled })()

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
