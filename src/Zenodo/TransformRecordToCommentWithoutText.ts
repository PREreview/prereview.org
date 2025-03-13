import { Temporal, toTemporalInstant } from '@js-temporal/polyfill'
import type * as Doi from 'doi-ts'
import { type Array, Either, ParseResult, Schema } from 'effect'
import type { Record } from 'zenodo-ts'
import type * as ReviewPage from '../review-page/index.js'
import * as Iso639 from '../types/iso639.js'
import * as Orcid from '../types/Orcid.js'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

declare const DoiSchema: Schema.Schema<Doi.Doi, unknown>

const PlainDateSchema: Schema.Schema<Temporal.PlainDate, string> = Schema.transformOrFail(
  Schema.String,
  Schema.instanceOf(Temporal.PlainDate),
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.try({
        try: () => Temporal.PlainDate.from(input, { overflow: 'reject' }),
        catch: () => new ParseResult.Type(ast, input, 'Not a PlainDate'),
      }),
    encode: date => ParseResult.succeed(date.toString()),
  },
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZenodoRecordForACommentSchema = () =>
  Schema.Struct({
    id: Schema.Number,
    files: Schema.NonEmptyArray(
      Schema.Struct({
        key: Schema.String,
        links: Schema.Struct({
          self: Schema.URL,
        }),
      }),
    ),
    metadata: Schema.Struct({
      access_right: Schema.Literal('open'),
      creators: Schema.NonEmptyArray(
        Schema.Struct({
          name: Schema.String,
          orcid: Schema.optionalWith(Orcid.OrcidSchema, { exact: true }),
        }),
      ),
      doi: DoiSchema,
      language: Iso639.Iso6393Schema,
      license: Schema.Struct({
        id: Schema.Literal('CC-BY-4.0'),
      }),
      publication_date: PlainDateSchema,
    }),
  })

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ZenodoRecordForAComment {
  id: number
  files: Array.NonEmptyReadonlyArray<{
    key: string
    links: {
      self: URL
    }
  }>
  metadata: {
    access_right: 'open'
    creators: Array.NonEmptyReadonlyArray<{
      name: string
      orcid?: Orcid.Orcid
    }>
    doi: Doi.Doi
    language: Iso639.Iso6393Code
    license: {
      id: 'CC-BY-4.0'
    }
    publication_date: Temporal.PlainDate
  }
}

export const transformRecordToCommentWithoutText = (record: Record): Either.Either<CommentWithoutText> =>
  Either.right({
    authors: { named: record.metadata.creators },
    doi: record.metadata.doi,
    language: 'en',
    id: record.id,
    license: 'CC-BY-4.0',
    published: toTemporalInstant.call(record.metadata.publication_date).toZonedDateTimeISO('UTC').toPlainDate(),
    textUrl: new URL('http://example.com'),
  })
