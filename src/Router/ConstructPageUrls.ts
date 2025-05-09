import { Option, pipe } from 'effect'
import type { PageResponse, StreamlinePageResponse, TwoUpPageResponse } from '../response.js'

export const canonical = (response: PageResponse | StreamlinePageResponse | TwoUpPageResponse, appOrigin: string) =>
  pipe(
    Option.fromNullable(response.canonical),
    Option.map(canonical => new URL(`${appOrigin}${encodeURI(canonical).replace(/^([^/])/, '/$1')}`)),
  )
