import { HashMap, HashSet, Option, pipe, Tuple } from 'effect'
import { SupportedLocales, type SupportedLocale } from '../locales/index.js'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../response.js'

export interface PageUrls {
  canonical: Option.Option<URL>
  localeUrls: HashMap.HashMap<SupportedLocale, URL>
}

export const constructPageUrls = (
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse,
  appOrigin: string,
  pathAndQueryString: string,
): PageUrls =>
  pipe(
    Option.fromNullable(response.canonical),
    Option.map(canonical => new URL(`${appOrigin}${encodeURI(canonical).replace(/^([^/])/, '/$1')}`)),
    canonical => ({
      canonical,
      localeUrls: pipe(
        SupportedLocales,
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
