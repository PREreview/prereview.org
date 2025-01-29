import { Temporal } from '@js-temporal/polyfill'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { isNonEmpty } from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import { isOrcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch.js'
import { sanitizeHtml } from './html.js'
import * as Preprint from './preprint.js'
import type { PhilsciPreprintId } from './types/preprint-id.js'

import PlainDate = Temporal.PlainDate
import PlainYearMonth = Temporal.PlainYearMonth

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const ReadonlyNonEmptyArrayD = flow(D.array, D.readonly, D.refine(isNonEmpty, 'NonEmptyArray'))

const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s),
      () => D.error(s, 'URL'),
    ),
  ),
)

const PlainYearMonthD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => PlainYearMonth.from(s, { overflow: 'reject' }),
      () => D.error(s, 'Plain Year-Month'),
    ),
  ),
)

const PlainDateD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => PlainDate.from(s, { overflow: 'reject' }),
      () => D.error(s, 'Plain Date'),
    ),
  ),
)

const OrcidD = D.fromRefinement(isOrcid, 'ORCID')

const EprintD = pipe(
  JsonD,
  D.compose(
    pipe(
      D.struct({
        type: D.string,
        eprintid: D.number,
        datestamp: PlainDateD,
        creators: ReadonlyNonEmptyArrayD(
          pipe(
            D.struct({
              name: D.struct({
                given: D.string,
                family: D.string,
              }),
            }),
            D.intersect(
              D.partial({
                orcid: D.nullable(OrcidD),
              }),
            ),
          ),
        ),
        title: D.string,
        uri: UrlD,
      }),
      D.intersect(
        D.partial({
          date: D.union(D.number, PlainDateD, PlainYearMonthD),
          abstract: D.string,
        }),
      ),
    ),
  ),
)

export const getPreprintFromPhilsci = flow(
  (id: PhilsciPreprintId) => getEprint(id.value),
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(3000)),
  RTE.chainEitherKW(eprintToPreprint),
  RTE.mapLeft(error =>
    match(error)
      .with(
        { status: P.union(Status.NotFound, Status.Unauthorized) },
        response => new Preprint.PreprintIsNotFound({ cause: response }),
      )
      .with('not a preprint', () => new Preprint.NotAPreprint({}))
      .otherwise(error => new Preprint.PreprintIsUnavailable({ cause: error })),
  ),
)

function toHttps(url: URL): URL {
  const httpsUrl = new URL(url)
  httpsUrl.protocol = 'https'

  return httpsUrl
}

const getEprint = flow(
  (id: number) =>
    new URL(`https://philsci-archive.pitt.edu/cgi/export/eprint/${id}/JSON/pittphilsci-eprint-${id}.json`),
  F.Request('GET'),
  F.send,
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(EprintD)),
)

function eprintToPreprint(eprint: D.TypeOf<typeof EprintD>): E.Either<D.DecodeError | string, Preprint.Preprint> {
  return pipe(
    E.Do,
    E.filterOrElse(
      () => eprint.type === 'pittpreprint',
      () => 'not a preprint',
    ),
    E.let('authors', () =>
      pipe(
        eprint.creators,
        RNEA.map(author => ({
          name: `${author.name.given} ${author.name.family}`,
          orcid: author.orcid ?? undefined,
        })),
      ),
    ),
    E.let('id', () => ({ type: 'philsci', value: eprint.eprintid }) satisfies PhilsciPreprintId),
    E.let('posted', () => eprint.date ?? eprint.datestamp),
    E.let('abstract', () =>
      typeof eprint.abstract === 'string'
        ? {
            language: 'en' as const,
            text: sanitizeHtml(`<p>${eprint.abstract}</p>`),
          }
        : undefined,
    ),
    E.let('title', () => ({
      language: 'en' as const,
      text: sanitizeHtml(eprint.title),
    })),
    E.let('url', () => toHttps(eprint.uri)),
  )
}
