import { Temporal } from '@js-temporal/polyfill'
import * as Doi from 'doi-ts'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import safeStableStringify from 'safe-stable-stringify'
import { timeoutRequest } from '../fetch'
import { parsePreprintDoi } from '../types/preprint-id'

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

export const RecentReviewRequestsC = pipe(
  JsonC,
  C.compose(
    C.array(
      C.struct({
        timestamp: InstantC,
        preprint: DoiUrlC,
      }),
    ),
  ),
)

export type RecentReviewRequestFromPrereviewCoarNotify = C.TypeOf<typeof RecentReviewRequestsC>[number]

export const getRecentReviewRequests = flow(
  (baseUrl: string) => new URL('/requests', baseUrl),
  F.Request('GET'),
  F.send,
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(RecentReviewRequestsC)),
  RTE.mapLeft(() => 'unavailable' as const),
)
