import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { HashMap, HashSet, Option, Tuple } from 'effect'
import { constructPageUrls } from '../../src/Router/ConstructPageUrls.ts'
import {
  CrowdinInContextLocale,
  DefaultLocale,
  getLocaleForLanguage,
  UserSelectableLanguages,
  UserSelectableLocales,
} from '../../src/locales/index.ts'
import type { PageResponse } from '../../src/response.ts'
import * as fc from '../fc.ts'

describe('constructPageUrls', () => {
  describe('when there is a canonical url', () => {
    describe('canonical', () => {
      describe('with a user-selectable locale', () => {
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

      describe('with a non-user-selectable locale', () => {
        it.prop(
          [
            fc
              .tuple(
                fc.constant(CrowdinInContextLocale),
                fc.url().filter(url => url.pathname !== '/'),
              )
              .map(([locale, url]) =>
                Tuple.make(
                  locale,
                  url.origin,
                  `${url.pathname}${url.search}`,
                  `${url.origin}${encodeURI(`${url.pathname}${url.search}`)}`,
                ),
              ),
            fc.string(),
          ],
          {
            examples: [
              [['lol-US', 'http://example.com', '/', 'http://example.com/'], '/anything'],
              [['lol-US', 'http://example.com', '/about', 'http://example.com/about'], '/anything'],
              [['lol-US', 'http://example.com', '/reviews?page=2', 'http://example.com/reviews?page=2'], '/anything'],
              [['lol-US', 'http://example.com', '/?foo=bar baz', 'http://example.com/?foo=bar%20baz'], '/anything'],
            ],
          },
        )('constructs an absolute url', ([locale, origin, canonical, expected]) => {
          const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, locale)

          expect(Option.getOrThrow(pageUrls).canonical.href).toStrictEqual(expected)
        })
      })
    })

    describe('localeUrls', () => {
      it.prop([fc.url().map(url => Tuple.make(url.origin, `${url.pathname}${url.search}`)), fc.userSelectableLocale()])(
        'constructs a url for each selectable locale and language',
        ([origin, canonical], locale) => {
          const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, locale)

          expect(HashMap.size(Option.getOrThrow(pageUrls).localeUrls)).toBe(
            HashSet.size(UserSelectableLocales) + HashSet.size(UserSelectableLanguages),
          )
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

      it.prop(
        [
          fc
            .tuple(
              fc.userSelectableLanguage(),
              fc.url().filter(url => url.pathname !== '/'),
            )
            .map(([language, url]) =>
              Tuple.make(
                language,
                url.origin,
                `${url.pathname}${url.search}`,
                `${url.origin}/${getLocaleForLanguage(language).toLowerCase()}${encodeURI(`${url.pathname}${url.search}`)}`,
              ),
            ),
        ],
        {
          examples: [
            [['en', 'http://example.com', '/', 'http://example.com/en-us']],
            [['en', 'http://example.com', '/about', 'http://example.com/en-us/about']],
            [['pt', 'http://example.com', '/about', 'http://example.com/pt-br/about']],
            [['en', 'http://example.com', '/reviews?page=2', 'http://example.com/en-us/reviews?page=2']],
            [['en', 'http://example.com', '/?foo=bar', 'http://example.com/en-us?foo=bar']],
          ],
        },
      )('constructs the url for each selectable language', ([language, origin, canonical, expected]) => {
        const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, DefaultLocale)

        expect(HashMap.unsafeGet(Option.getOrThrow(pageUrls).localeUrls, language).href).toStrictEqual(expected)
      })
    })

    describe('xDefault', () => {
      it.prop(
        [
          fc.supportedLocale(),
          fc
            .url()
            .filter(url => url.pathname !== '/')
            .map(url =>
              Tuple.make(
                url.origin,
                `${url.pathname}${url.search}`,
                `${url.origin}${encodeURI(`${url.pathname}${url.search}`)}`,
              ),
            ),
        ],
        {
          examples: [
            ['lol-US', ['http://example.com', '/', 'http://example.com/']],
            ['en-US', ['http://example.com', '/about', 'http://example.com/about']],
            ['pt-BR', ['http://example.com', '/reviews?page=2', 'http://example.com/reviews?page=2']],
            ['es-419', ['http://example.com', '/?foo=bar baz', 'http://example.com/?foo=bar%20baz']],
          ],
        },
      )('constructs an absolute url', (locale, [origin, canonical, expected]) => {
        const pageUrls = constructPageUrls({ canonical } as unknown as PageResponse, origin, locale)

        expect(Option.getOrThrow(pageUrls).xDefault.href).toStrictEqual(expected)
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
