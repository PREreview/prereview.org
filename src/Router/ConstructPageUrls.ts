import { HashMap, HashSet, Option, pipe, Tuple } from 'effect'
import { UserSelectableLocales, type SupportedLocale } from '../locales/index.js'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../response.js'

export interface PageUrls {
  canonical: Option.Option<URL>
  localeUrls: HashMap.HashMap<SupportedLocale, URL>
}

export const constructPageUrls = (
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse,
  appOrigin: string,
  locale: SupportedLocale,
  pathAndQueryString: string,
): PageUrls =>
  pipe(
    Option.fromNullable(response.canonical),
    Option.map(
      canonical => new URL(`${appOrigin}/${locale.toLowerCase()}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
    ),
    canonical => ({
      canonical,
      localeUrls: pipe(
        UserSelectableLocales,
        HashSet.map(locale =>
          Tuple.make(
            locale,
            new URL(`${appOrigin}/${locale.toLowerCase()}${pathAndQueryString.replace(/^\/(?=\?|$)/, '')}`),
          ),
        ),
        HashMap.fromIterable,
      ),
    }),
  )
