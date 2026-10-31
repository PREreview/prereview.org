import { Array, Data, Result, Option, pipe, Schema, String } from 'effect'
import type * as ReviewPage from '../../WebApp/review-page/index.ts'
import { Doi, Name, OrcidId, Temporal } from '../../types/index.ts'
import * as Iso639 from '../../types/iso639.ts'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

export const ZenodoRecordForACommentSchema = Schema.Struct({
  id: Schema.Number,
  files: Schema.NonEmptyArray(
    Schema.Struct({
      key: Schema.String,
      links: Schema.Struct({
        self: Schema.URLFromString,
      }),
    }),
  ),
  metadata: Schema.Struct({
    access_right: Schema.Literal('open'),
    creators: Schema.NonEmptyArray(
      Schema.Struct({
        name: Name.NameSchema,
        orcid: Schema.optionalKey(OrcidId.OrcidIdSchema),
      }),
    ),
    doi: Doi.DoiSchema,
    language: Schema.optionalKey(Iso639.Iso6393Schema),
    license: Schema.Struct({
      id: Schema.Literal('cc-by-4.0'),
    }),
    publication_date: Temporal.PlainDateSchema,
  }),
})

export type ZenodoRecordForAComment = typeof ZenodoRecordForACommentSchema.Type

export const pickOutTextUrl = (files: ZenodoRecordForAComment['files']) =>
  pipe(
    Array.filter(files, file => file.key.endsWith('.html')),
    Option.liftPredicate(filteredFiles => filteredFiles.length === 1),
    Option.andThen(Array.head),
    Option.andThen(file => file.links.self),
  )

class NoTextUrlAvailable extends Data.TaggedError('NoTextUrlAvailable')<{ affectedRecordId: number }> {}

export const transformRecordToCommentWithoutText = (
  record: ZenodoRecordForAComment,
): Result.Result<CommentWithoutText, NoTextUrlAvailable> =>
  pipe(
    pickOutTextUrl(record.files),
    Result.fromOption(() => new NoTextUrlAvailable({ affectedRecordId: record.id })),
    Result.andThen(
      textUrl =>
        ({
          authors: { named: record.metadata.creators },
          doi: record.metadata.doi,
          language: record.metadata.language ? Iso639.iso6393To1(record.metadata.language) : undefined,
          id: record.id,
          license: String.toUpperCase(record.metadata.license.id),
          published: record.metadata.publication_date,
          textUrl,
        }) satisfies CommentWithoutText,
    ),
  )
