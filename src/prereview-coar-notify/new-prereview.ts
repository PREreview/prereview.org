import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { constVoid, identity, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'

export interface NewPrereview {
  url: URL
  author: {
    name: string
  }
}

export const postNewPrereview = ({
  baseUrl,
  apiToken,
  newPrereview,
}: {
  baseUrl: URL
  apiToken: string
  newPrereview: NewPrereview
}) =>
  pipe(
    new URL('/prereviews', baseUrl),
    F.Request('POST'),
    F.setBody(JSON.stringify(newPrereview), 'application/json'),
    F.setHeader('Authorization', `Bearer ${apiToken}`),
    F.send,
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.bimap(() => 'unavailable' as const, constVoid),
  )
