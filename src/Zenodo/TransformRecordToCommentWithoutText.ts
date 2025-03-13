import { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Option, ParseResult, pipe, Schema } from 'effect'
import type * as ReviewPage from '../review-page/index.js'
import * as Doi from '../types/Doi.js'
import * as Iso639 from '../types/iso639.js'
import * as Orcid from '../types/Orcid.js'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

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

export const ZenodoRecordForACommentSchema = Schema.Struct({
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
    doi: Doi.DoiSchema,
    language: Iso639.Iso6393Schema,
    license: Schema.Struct({
      id: Schema.Literal('CC-BY-4.0'),
    }),
    publication_date: PlainDateSchema,
  }),
})

export interface ZenodoRecordForAComment {
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

export const pickOutTextUrl = (files: ZenodoRecordForAComment['files']) =>
  pipe(
    Array.findFirst(files, file => file.key.endsWith('.html')),
    Option.andThen(file => file.links.self),
  )

class NoTextUrlAvailable extends Data.TaggedError('NoTextUrlAvailable')<{ affectedRecordId: number }> {}

export const transformRecordToCommentWithoutText = (
  record: ZenodoRecordForAComment,
): Either.Either<CommentWithoutText, NoTextUrlAvailable> =>
  pipe(
    pickOutTextUrl(record.files),
    Either.fromOption(() => new NoTextUrlAvailable({ affectedRecordId: record.id })),
    Either.andThen(
      textUrl =>
        ({
          authors: { named: record.metadata.creators },
          doi: record.metadata.doi,
          language: 'en',
          id: record.id,
          license: 'CC-BY-4.0',
          published: record.metadata.publication_date,
          textUrl,
        }) satisfies CommentWithoutText,
    ),
  )
