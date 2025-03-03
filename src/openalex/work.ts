import { type Doi, toUrl } from 'doi-ts'
import { Either, Equivalence, flow, Schema, String, Struct } from 'effect'
import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import { Status } from 'hyper-ts'
import * as EffectToFpTs from '../EffectToFpts.js'
import { timeoutRequest } from '../fetch.js'
import { NetworkError, UnableToDecodeBody, UnexpectedStatusCode } from './http.js'

export type Work = typeof WorkSchema.Type

export const WorkSchema = Schema.Struct({
  topics: Schema.Array(
    Schema.Struct({
      id: Schema.URL,
      display_name: Schema.String,
      subfield: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      field: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
      domain: Schema.Struct({
        id: Schema.URL,
        display_name: Schema.String,
      }),
    }),
  ),
})

export const getWorkByDoi: (
  doi: Doi,
) => RTE.ReaderTaskEither<F.FetchEnv, NetworkError | UnexpectedStatusCode | UnableToDecodeBody, Work> = flow(
  doi => `https://api.openalex.org/works/${toUrl(doi).href}`,
  F.Request('GET'),
  F.send,
  RTE.local(timeoutRequest(2000)),
  RTE.mapLeft(NetworkError),
  RTE.filterOrElseW(F.hasStatus(Status.OK), response => UnexpectedStatusCode(response.status)),
  RTE.chainTaskEitherKW(F.getText(() => UnableToDecodeBody())),
  RTE.chainEitherKW(flow(Schema.decodeEither(Schema.parseJson(WorkSchema)), Either.mapLeft(UnableToDecodeBody))),
)

const UrlEquivalence: Equivalence.Equivalence<URL> = Equivalence.mapInput(String.Equivalence, url => url.href)

export const getCategories: (work: Work) => ReadonlyArray<{ id: URL; display_name: string }> = flow(
  work => work.topics,
  RA.flatMap(topic => [
    { id: topic.id, display_name: topic.display_name },
    { id: topic.subfield.id, display_name: topic.subfield.display_name },
    { id: topic.field.id, display_name: topic.field.display_name },
    { id: topic.domain.id, display_name: topic.domain.display_name },
  ]),
  RA.uniq(EffectToFpTs.eq(Equivalence.mapInput(UrlEquivalence, Struct.get('id')))),
)
