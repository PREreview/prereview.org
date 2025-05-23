import { Temporal } from '@js-temporal/polyfill'
import * as Doi from 'doi-ts'
import { flow, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import iso6391 from 'iso-639-1'
import * as L from 'logger-fp-ts'
import safeStableStringify from 'safe-stable-stringify'
import { isFieldId } from '../types/field.js'
import { parsePreprintDoi } from '../types/preprint-id.js'
import { isSubfieldId } from '../types/subfield.js'

import Instant = Temporal.Instant

const JsonC = C.make(
  {
    decode: (s: string) =>
      pipe(
        J.parse(s),
        E.mapLeft(() => D.error(s, 'JSON')),
      ),
  },
  { encode: j => safeStableStringify(j) },
)

const InstantC = C.make(
  pipe(
    D.string,
    D.parse(string =>
      E.tryCatch(
        () => Instant.from(string),
        () => D.error(string, 'Instant'),
      ),
    ),
  ),
  { encode: String },
)

const DoiUrlC = C.make(
  pipe(
    D.string,
    D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parsePreprintDoi(s))),
  ),
  { encode: id => Doi.toUrl(id.value).href },
)

const FieldIdC = pipe(C.string, C.refine(isFieldId, 'FieldId'))

const SubfieldIdC = pipe(C.string, C.refine(isSubfieldId, 'SubfieldId'))

const LanguageC = pipe(C.string, C.refine(iso6391.validate, 'LanguageCode'))

export const RecentReviewRequestsC = pipe(
  JsonC,
  C.compose(
    C.array(
      C.struct({
        timestamp: InstantC,
        preprint: DoiUrlC,
        fields: C.array(FieldIdC),
        subfields: C.array(SubfieldIdC),
        language: C.nullable(LanguageC),
      }),
    ),
  ),
)

export type RecentReviewRequestFromPrereviewCoarNotify = C.TypeOf<typeof RecentReviewRequestsC>[number]

export const getRecentReviewRequests = flow(
  (baseUrl: URL) => new URL('/requests', baseUrl),
  F.Request('GET'),
  F.send,
  RTE.mapLeft(() => 'network'),
  RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
  RTE.chainTaskEitherKW(flow(F.decode(RecentReviewRequestsC), TE.mapLeft(D.draw))),
  RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get recent review requests')))),
  RTE.mapLeft(() => 'unavailable' as const),
)
