import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { constVoid, flow, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as L from 'logger-fp-ts'

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
    RTE.mapLeft(() => 'network'),
    RTE.filterOrElseW(F.hasStatus(Status.Created), () => 'non-201-response' as const),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get recent review requests')))),
    RTE.bimap(() => 'unavailable' as const, constVoid),
  )
