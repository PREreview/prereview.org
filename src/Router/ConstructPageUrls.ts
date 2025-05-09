import { HashMap, Option, pipe } from 'effect'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../response.js'

export interface PageUrls {
  canonical: Option.Option<URL>
  localeUrls: HashMap.HashMap<SupportedLocale, URL>
}

export const constructPageUrls = (
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse,
  appOrigin: string,
): PageUrls =>
  pipe(
    Option.fromNullable(response.canonical),
    Option.map(canonical => new URL(`${appOrigin}${encodeURI(canonical).replace(/^([^/])/, '/$1')}`)),
    canonical => ({
      canonical,
      localeUrls: HashMap.empty(),
    }),
  )
