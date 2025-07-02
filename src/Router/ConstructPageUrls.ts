import { HashMap, HashSet, Option, pipe, Tuple } from 'effect'
import { UserSelectableLocales, type SupportedLocale, type UserSelectableLocale } from '../locales/index.js'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../response.js'

export interface PageUrls {
  canonical: URL
  localeUrls: HashMap.HashMap<UserSelectableLocale, URL>
}

export const constructPageUrls = (
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse,
  appOrigin: string,
  locale: SupportedLocale,
): Option.Option<PageUrls> =>
  pipe(
    Option.fromNullable(response.canonical),
    Option.map(canonical => ({
      canonical: new URL(`${appOrigin}/${locale.toLowerCase()}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
      localeUrls: pipe(
        UserSelectableLocales,
        HashSet.map(locale =>
          Tuple.make(
            locale,
            new URL(`${appOrigin}/${locale.toLowerCase()}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
          ),
        ),
        HashMap.fromIterable,
      ),
    })),
  )
