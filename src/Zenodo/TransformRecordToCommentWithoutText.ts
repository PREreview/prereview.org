import { toTemporalInstant } from '@js-temporal/polyfill'
import { Either } from 'effect'
import type { Record } from 'zenodo-ts'
import type * as ReviewPage from '../review-page/index.js'

export type CommentWithoutText = Omit<ReviewPage.Comment, 'text'> & { textUrl: URL }

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
