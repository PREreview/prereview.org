import { expect, test } from '../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { type Option, Result } from 'effect'
import * as _ from '../../../src/Domain/Comments/ImportPublicationDateForComment.ts'
import * as Events from '../../../src/Events.ts'
import { Uuid } from '../../../src/types/index.ts'

const commentId = Uuid.Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8')
const otherCommentId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const publishedAt = Temporal.Instant.from('2024-11-21T14:30:00Z')

const input = { commentId, publishedAt } satisfies _.Input

const imported = new Events.PublicationDateForCommentWasImported(input)

test.each<[string, ReadonlyArray<Events.Event>, _.Input, Result.Result<Option.Option<Events.Event>, _.Error>]>([
  ['not published', [], input, Result.fail(new _.CommentIsNotPublished())],
  [
    'another comment published',
    [new Events.CommentWasPublished({ commentId: otherCommentId })],
    input,
    Result.fail(new _.CommentIsNotPublished()),
  ],
  ['published without a date', [new Events.CommentWasPublished({ commentId })], input, Result.succeedSome(imported)],
  [
    'published with the same date',
    [new Events.CommentWasPublished({ commentId, publishedAt })],
    input,
    Result.succeedNone,
  ],
  [
    'published with a different date',
    [new Events.CommentWasPublished({ commentId, publishedAt: Temporal.Instant.from('2024-11-22T09:00:00Z') })],
    input,
    Result.fail(new _.UnexpectedPublicationDate()),
  ],
  [
    'already imported with the same date',
    [new Events.CommentWasPublished({ commentId }), imported],
    { commentId, publishedAt: Temporal.Instant.fromEpochNanoseconds(publishedAt.epochNanoseconds) },
    Result.succeedNone,
  ],
  [
    'already imported with a different date',
    [new Events.CommentWasPublished({ commentId }), imported],
    { commentId, publishedAt: Temporal.Instant.from('2024-11-22T09:00:00Z') },
    Result.fail(new _.UnexpectedPublicationDate()),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ImportPublicationDateForComment

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
