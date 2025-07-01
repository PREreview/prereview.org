import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { HashMap, HashSet, Option, Tuple } from 'effect'
import { constructPageUrls } from '../../src/Router/ConstructPageUrls.js'
import { SupportedLocales } from '../../src/locales/index.js'
import type { PageResponse } from '../../src/response.js'
import * as fc from '../fc.js'

describe('constructPageUrls', () => {
  describe('canonical', () => {
    it.prop(
      [
        fc
          .url()
          .map(url =>
            Tuple.make(
              url.origin,
              `${url.pathname}${url.search}`,
              `${url.origin}${encodeURI(`${url.pathname}${url.search}`)}`,
            ),
          ),
        fc.string(),
      ],
      {
        examples: [
          [['http://example.com', '/', 'http://example.com/'], '/anything'],
          [['http://example.com', '/about', 'http://example.com/about'], '/anything'],
          [['http://example.com', '/reviews?page=2', 'http://example.com/reviews?page=2'], '/anything'],
          [['http://example.com', '/?foo=bar baz', 'http://example.com/?foo=bar%20baz'], '/anything'],
        ],
      },
    )('constructs an absolute url', ([origin, canonical, expected], pathAndQueryString) => {
      const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, pathAndQueryString)

      expect(Option.getOrUndefined(pageUrls.canonical)?.href).toStrictEqual(expected)
    })

    it.prop([fc.url().map(url => Tuple.make(url.origin, `${url.pathname}${url.search}`))])(
      "does nothing when there isn't one",
      ([origin, pathAndQueryString]) => {
        const pageUrls = constructPageUrls({} as unknown as PageResponse, origin, pathAndQueryString)

        expect(pageUrls.canonical).toStrictEqual(Option.none())
      },
    )
  })

  describe('localeUrls', () => {
    it.prop([fc.url().map(url => Tuple.make(url.origin, `${url.pathname}${url.search}`))])(
      'constructs a url for each supported locale',
      ([origin, pathAndQueryString]) => {
        const pageUrls = constructPageUrls({} as unknown as PageResponse, origin, pathAndQueryString)

        expect(HashMap.size(pageUrls.localeUrls)).toBe(HashSet.size(SupportedLocales))
      },
    )

    it.prop(
      [
        fc
          .tuple(
            fc.supportedLocale(),
            fc.url().filter(url => url.pathname !== '/'),
          )
          .map(([locale, url]) =>
            Tuple.make(
              locale,
              url.origin,
              `${url.pathname}${url.search}`,
              `${url.origin}/${locale.toLowerCase()}${url.pathname}${url.search}`,
            ),
          ),
      ],
      {
        examples: [
          [['en-US', 'http://example.com', '/', 'http://example.com/en-us']],
          [['en-US', 'http://example.com', '/about', 'http://example.com/en-us/about']],
          [['pt-BR', 'http://example.com', '/about', 'http://example.com/pt-br/about']],
          [['en-US', 'http://example.com', '/reviews?page=2', 'http://example.com/en-us/reviews?page=2']],
          [['en-US', 'http://example.com', '/?foo=bar', 'http://example.com/en-us?foo=bar']],
        ],
      },
    )('constructs the url for each supported locale', ([locale, origin, pathAndQueryString, expected]) => {
      const pageUrls = constructPageUrls({} as unknown as PageResponse, origin, pathAndQueryString)

      expect(HashMap.unsafeGet(pageUrls.localeUrls, locale).href).toStrictEqual(expected)
    })
  })
})
