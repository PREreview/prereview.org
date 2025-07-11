import { flow, ParseResult, pipe, Schema } from 'effect'
import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import iso6391 from 'iso-639-1'
import * as L from 'logger-fp-ts'
import * as EffectToFpts from '../EffectToFpts.js'
import * as FptsToEffect from '../FptsToEffect.js'
import { RecentReviewRequestsAreUnavailable } from '../review-requests-page/index.js'
import { isFieldId } from '../types/field.js'
import { Doi, Temporal } from '../types/index.js'
import { IndeterminatePreprintIdWithDoi, parsePreprintDoi } from '../types/preprint-id.js'
import { isSubfieldId } from '../types/subfield.js'

const IndeterminatePreprintIdFromDoiSchema = Schema.transformOrFail(
  Doi.DoiSchema,
  Schema.typeSchema(IndeterminatePreprintIdWithDoi),
  {
    strict: true,
    decode: (doi, _, ast) =>
      ParseResult.fromOption(
        FptsToEffect.option(parsePreprintDoi(doi)),
        () => new ParseResult.Type(ast, doi, 'Not a preprint DOI'),
      ),
    encode: id => ParseResult.succeed(id.value),
  },
)

const FieldIdSchema = pipe(Schema.String, Schema.filter(isFieldId))

const SubfieldIdSchema = pipe(Schema.String, Schema.filter(isSubfieldId))

const LanguageSchema = pipe(Schema.String, Schema.filter(iso6391.validate))

export const RecentReviewRequestsSchema = Schema.Array(
  Schema.Struct({
    timestamp: Temporal.InstantSchema,
    preprint: IndeterminatePreprintIdFromDoiSchema,
    fields: Schema.Array(FieldIdSchema),
    subfields: Schema.Array(SubfieldIdSchema),
    language: Schema.NullOr(LanguageSchema),
  }),
)

export type RecentReviewRequestFromPrereviewCoarNotify = (typeof RecentReviewRequestsSchema.Type)[number]

export const getRecentReviewRequests = flow(
  (baseUrl: URL) => new URL('/requests', baseUrl),
  F.Request('GET'),
  F.send,
  RTE.mapLeft(() => 'network'),
  RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
  RTE.chainTaskEitherKW(flow(F.decode(D.string), TE.mapLeft(D.draw))),
  RTE.chainW(EffectToFpts.toReaderTaskEitherK(Schema.decode(Schema.parseJson(RecentReviewRequestsSchema)))),
  RTE.orElseFirstW(
    RTE.fromReaderIOK(flow(error => ({ error: error.toString() }), L.errorP('Failed to get recent review requests'))),
  ),
  RTE.mapLeft(cause => new RecentReviewRequestsAreUnavailable({ cause })),
)
