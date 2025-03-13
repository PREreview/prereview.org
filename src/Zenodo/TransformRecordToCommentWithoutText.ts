import { type Temporal, toTemporalInstant } from '@js-temporal/polyfill'
import type * as Doi from 'doi-ts'
import { type Array, Either, Schema } from 'effect'
import type * as Orcid from 'orcid-id-ts'
import type { Record } from 'zenodo-ts'
import type * as ReviewPage from '../review-page/index.js'
import type * as Iso639 from '../types/iso639.js'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

declare const OrcidSchema: Schema.Schema<Orcid.Orcid, unknown>

declare const DoiSchema: Schema.Schema<Doi.Doi, unknown>

declare const Iso6393Schema: Schema.Schema<Iso639.Iso6393Code, unknown>

declare const PlainDateSchema: Schema.Schema<Temporal.PlainDate, unknown>

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
          orcid: Schema.optionalWith(OrcidSchema, { exact: true }),
        }),
      ),
      doi: DoiSchema,
      language: Iso6393Schema,
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
