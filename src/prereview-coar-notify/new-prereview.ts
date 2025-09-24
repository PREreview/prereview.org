import type { Doi } from 'doi-ts'
import { flow, Function, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as L from 'logger-fp-ts'
import * as StatusCodes from '../StatusCodes.ts'

export interface NewPrereview {
  preprint: { doi?: Doi }
  doi: Doi
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
    RTE.filterOrElseW(F.hasStatus(StatusCodes.Created), () => 'non-201-response' as const),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to post new PREreview')))),
    RTE.bimap(() => 'unavailable' as const, Function.constVoid),
  )
