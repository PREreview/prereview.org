import { type Doi, toUrl } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as J from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { timeoutRequest } from '../fetch.js'
import { NetworkError, UnableToDecodeBody, UnexpectedStatusCode } from './http.js'

export type Work = C.TypeOf<typeof WorkC>

const UrlC = C.make(
  pipe(
    D.string,
    D.parse(s =>
      E.tryCatch(
        () => new URL(s),
        () => D.error(s, 'URL'),
      ),
    ),
  ),
  { encode: url => url.href },
)

export const WorkC = C.struct({
  topics: C.array(
    C.struct({
      id: UrlC,
      display_name: C.string,
      subfield: C.struct({
        id: UrlC,
        display_name: C.string,
      }),
      field: C.struct({
        id: UrlC,
        display_name: C.string,
      }),
      domain: C.struct({
        id: UrlC,
        display_name: C.string,
      }),
    }),
  ),
})

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

export const getWorkByDoi: (
  doi: Doi,
) => RTE.ReaderTaskEither<F.FetchEnv, NetworkError | UnexpectedStatusCode | UnableToDecodeBody, Work> = flow(
  doi => `https://api.openalex.org/works/${toUrl(doi).href}`,
  F.Request('GET'),
  F.send,
  RTE.local(timeoutRequest(2000)),
  RTE.mapLeft(NetworkError),
  RTE.filterOrElseW(F.hasStatus(Status.OK), response => UnexpectedStatusCode(response.status)),
  RTE.chainTaskEitherKW(flow(F.decode(pipe(JsonD, D.compose(WorkC))), TE.mapLeft(UnableToDecodeBody))),
)

const eqUrl: Eq.Eq<URL> = pipe(
  s.Eq,
  Eq.contramap(url => url.href),
)

export const getCategories: (work: Work) => ReadonlyArray<{ id: URL; display_name: string }> = flow(
  work => work.topics,
  RA.flatMap(topic => [
    { id: topic.id, display_name: topic.display_name },
    { id: topic.subfield.id, display_name: topic.subfield.display_name },
    { id: topic.field.id, display_name: topic.field.display_name },
    { id: topic.domain.id, display_name: topic.domain.display_name },
  ]),
  RA.uniq(pipe(eqUrl, Eq.contramap(get('id')))),
)
