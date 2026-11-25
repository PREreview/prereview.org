import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as _ from '../../../../src/Domain/Comments/GetPublishedCommentsForAPrereview/ListPublishedComments.ts'
import * as Events from '../../../../src/Events.ts'
import * as Queries from '../../../../src/EventSourcing/Queries.ts'
import { html } from '../../../../src/html.ts'
import { Doi, NonEmptyString, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const prereviewId = 123
const commentId1 = Uuid.Uuid('e51a69b7-df03-4b89-b803-2f452767ecf8')
const commentId2 = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const authorId = OrcidId.OrcidId('0000-0002-1825-0097')

const writtenComment = ({
  commentId,
  forPrereview = prereviewId,
  id,
}: {
  commentId: Uuid.Uuid
  forPrereview?: number
  id: number
}) => [
  new Events.CommentWasStarted({ commentId, prereviewId: forPrereview, authorId }),
  new Events.CommentWasEntered({ commentId, comment: html`<p>Comment ${id}</p>` }),
  new Events.PersonaForCommentWasChosen({ commentId, persona: 'pseudonym' }),
  new Events.CompetingInterestsForCommentWereDeclared({
    commentId,
    competingInterests: Option.some(NonEmptyString.NonEmptyString('Some competing interests')),
  }),
  new Events.CodeOfConductForCommentWasAgreed({ commentId }),
  new Events.ExistenceOfVerifiedEmailAddressForCommentWasConfirmed({ commentId }),
  new Events.PublicationOfCommentWasRequested({ commentId }),
  new Events.CommentWasAssignedADoi({ commentId, id, doi: Doi.Doi(`10.5281/zenodo.${id}`) }),
]

const expected = ({
  commentId,
  id,
  publishedAt,
}: {
  commentId: Uuid.Uuid
  id: number
  publishedAt: Temporal.Instant
}): _.PublishedComment => ({
  authorId,
  comment: html`<p>Comment ${id}</p>`,
  commentId,
  competingInterests: Option.some(NonEmptyString.NonEmptyString('Some competing interests')),
  doi: Doi.Doi(`10.5281/zenodo.${id}`),
  id,
  license: 'CC-BY-4.0',
  persona: 'pseudonym',
  publishedAt,
})

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], Result.succeed([])],
  ['not yet published', writtenComment({ commentId: commentId1, id: 1 }), Result.succeed([])],
  [
    'published with a date',
    [
      ...writtenComment({ commentId: commentId1, id: 1 }),
      new Events.CommentWasPublished({
        commentId: commentId1,
        publishedAt: Temporal.Instant.from('2026-11-01T09:00:00Z'),
      }),
    ],
    Result.succeed([
      expected({ commentId: commentId1, id: 1, publishedAt: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
    ]),
  ],
  [
    'published, with an imported date',
    [
      ...writtenComment({ commentId: commentId1, id: 1 }),
      new Events.CommentWasPublished({ commentId: commentId1 }),
      new Events.PublicationDateForCommentWasImported({
        commentId: commentId1,
        publishedAt: Temporal.Instant.from('2024-11-21T15:47:31Z'),
      }),
    ],
    Result.succeed([
      expected({ commentId: commentId1, id: 1, publishedAt: Temporal.Instant.from('2024-11-21T15:47:31Z') }),
    ]),
  ],
  [
    'several published, newest first',
    [
      ...writtenComment({ commentId: commentId1, id: 1 }),
      ...writtenComment({ commentId: commentId2, id: 2 }),
      new Events.CommentWasPublished({
        commentId: commentId1,
        publishedAt: Temporal.Instant.from('2026-11-01T09:00:00Z'),
      }),
      new Events.CommentWasPublished({
        commentId: commentId2,
        publishedAt: Temporal.Instant.from('2026-11-02T09:00:00Z'),
      }),
    ],
    Result.succeed([
      expected({ commentId: commentId2, id: 2, publishedAt: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
      expected({ commentId: commentId1, id: 1, publishedAt: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
    ]),
  ],
  [
    'published on another review',
    [
      ...writtenComment({ commentId: commentId1, forPrereview: 456, id: 1 }),
      new Events.CommentWasPublished({
        commentId: commentId1,
        publishedAt: Temporal.Instant.from('2026-11-01T09:00:00Z'),
      }),
    ],
    Result.succeed([]),
  ],
  [
    'published without a known date',
    [...writtenComment({ commentId: commentId1, id: 1 }), new Events.CommentWasPublished({ commentId: commentId1 })],
    Result.fail(new Queries.UnexpectedSequenceOfEvents({ cause: 'no publication date' })),
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListPublishedComments

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, prereviewId)

  expect(actual).toStrictEqual(expected)
})
