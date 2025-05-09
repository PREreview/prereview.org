import { Option, pipe } from 'effect'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../response.js'

interface PageUrls {
  canonical: Option.Option<URL>
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
    }),
  )
