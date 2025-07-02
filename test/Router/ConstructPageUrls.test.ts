import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { HashMap, HashSet, Option, Tuple } from 'effect'
import { constructPageUrls } from '../../src/Router/ConstructPageUrls.js'
import { DefaultLocale, UserSelectableLocales } from '../../src/locales/index.js'
import type { PageResponse } from '../../src/response.js'
import * as fc from '../fc.js'

describe('constructPageUrls', () => {
  describe('when there is a canonical url', () => {
    describe('canonical', () => {
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
                `${url.origin}/${locale.toLowerCase()}${encodeURI(`${url.pathname}${url.search}`)}`,
              ),
            ),
          fc.string(),
        ],
        {
          examples: [
            [['en-US', 'http://example.com', '/', 'http://example.com/en-us'], '/anything'],
            [['en-US', 'http://example.com', '/about', 'http://example.com/en-us/about'], '/anything'],
            [['pt-BR', 'http://example.com', '/about', 'http://example.com/pt-br/about'], '/anything'],
            [
              ['en-US', 'http://example.com', '/reviews?page=2', 'http://example.com/en-us/reviews?page=2'],
              '/anything',
            ],
            [['en-US', 'http://example.com', '/?foo=bar baz', 'http://example.com/en-us?foo=bar%20baz'], '/anything'],
          ],
        },
      )('constructs an absolute url', ([locale, origin, canonical, expected]) => {
        const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, locale)

        expect(Option.getOrThrow(pageUrls).canonical.href).toStrictEqual(expected)
      })
    })

    describe('localeUrls', () => {
      it.prop([fc.url().map(url => Tuple.make(url.origin, `${url.pathname}${url.search}`)), fc.userSelectableLocale()])(
        'constructs a url for each selectable locale',
        ([origin, canonical], locale) => {
          const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, locale)

          expect(HashMap.size(Option.getOrThrow(pageUrls).localeUrls)).toBe(HashSet.size(UserSelectableLocales))
        },
      )

      it.prop(
        [
          fc
            .tuple(
              fc.userSelectableLocale(),
              fc.url().filter(url => url.pathname !== '/'),
            )
            .map(([locale, url]) =>
              Tuple.make(
                locale,
                url.origin,
                `${url.pathname}${url.search}`,
                `${url.origin}/${locale.toLowerCase()}${encodeURI(`${url.pathname}${url.search}`)}`,
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
      )('constructs the url for each selectable locale', ([locale, origin, canonical, expected]) => {
        const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, DefaultLocale)

        expect(HashMap.unsafeGet(Option.getOrThrow(pageUrls).localeUrls, locale).href).toStrictEqual(expected)
      })
    })
  })

  describe("when there isn't a canonical url", () => {
    it.prop([fc.url(), fc.supportedLocale()])('returns a none', (origin, locale) => {
      const pageUrls = constructPageUrls({} as unknown as PageResponse, origin.href, locale)

      expect(pageUrls).toStrictEqual(Option.none())
    })
  })
})
