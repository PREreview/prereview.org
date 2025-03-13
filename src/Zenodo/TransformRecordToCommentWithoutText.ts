import { type Temporal, toTemporalInstant } from '@js-temporal/polyfill'
import type * as Doi from 'doi-ts'
import { type Array, Either } from 'effect'
import type * as Orcid from 'orcid-id-ts'
import type { Record } from 'zenodo-ts'
import type * as ReviewPage from '../review-page/index.js'
import type * as Iso639 from '../types/iso639.js'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ZenodoRecordForAComment {
  id: number
  files: Array.NonEmptyArray<{
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
