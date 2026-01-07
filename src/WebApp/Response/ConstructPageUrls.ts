import { Boolean, HashMap, HashSet, Option, pipe, Tuple } from 'effect'
import {
  getLocaleForLanguage,
  isUserSelectableLocale,
  UserSelectableLanguages,
  UserSelectableLocales,
  type SupportedLocale,
  type UserSelectableLanguage,
  type UserSelectableLocale,
} from '../../locales/index.ts'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from './Response.ts'

export interface PageUrls {
  canonical: URL
  localeUrls: HashMap.HashMap<UserSelectableLocale | UserSelectableLanguage, URL>
  xDefault: URL
}

export const constructPageUrls = (
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse,
  appOrigin: string,
  locale: SupportedLocale,
): Option.Option<PageUrls> =>
  pipe(
    Option.fromNullable(response.canonical),
    Option.map(canonical => ({
      canonical: Boolean.match(isUserSelectableLocale(locale), {
        onTrue: () => new URL(`${appOrigin}/${locale.toLowerCase()}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
        onFalse: () => new URL(`${appOrigin}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
      }),
      localeUrls: pipe(
        UserSelectableLocales,
        HashSet.map(locale =>
          Tuple.make(
            locale,
            new URL(`${appOrigin}/${locale.toLowerCase()}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
          ),
        ),
        HashMap.fromIterable,
        HashMap.union(
          pipe(
            UserSelectableLanguages,
            HashSet.map(langauge =>
              Tuple.make(
                langauge,
                new URL(
                  `${appOrigin}/${getLocaleForLanguage(langauge).toLowerCase()}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`,
                ),
              ),
            ),
            HashMap.fromIterable,
          ),
        ),
      ),
      xDefault: new URL(`${appOrigin}${encodeURI(canonical).replace(/^\/(?=\?|$)/, '')}`),
    })),
  )
