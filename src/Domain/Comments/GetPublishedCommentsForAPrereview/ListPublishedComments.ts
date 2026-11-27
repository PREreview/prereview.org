import { Array, HashMap, Match, Option, Order, pipe, Result } from 'effect'
import type { Html } from '../../../html.ts'
import type { Doi } from '../../../types/Doi.ts'
import { Temporal, type NonEmptyString, type Uuid } from '../../../types/index.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import * as Events from '../../Events/index.ts'
import { Queries } from '../../Events/index.ts'

export interface PublishedComment {
  readonly authorId: OrcidId
  readonly comment: Html
  readonly commentId: Uuid.Uuid
  readonly competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  readonly doi: Doi
  readonly id: number
  readonly license: 'CC-BY-4.0'
  readonly persona: 'public' | 'pseudonym'
  readonly publishedAt: Temporal.Instant
}

export type Result = Result.Result<ReadonlyArray<PublishedComment>, Queries.UnexpectedSequenceOfEvents>

const filter = Events.EventFilter({
  types: [
    'CommentWasStarted',
    'CommentWasEntered',
    'PersonaForCommentWasChosen',
    'CompetingInterestsForCommentWereDeclared',
    'CommentWasAssignedADoi',
    'CommentWasPublished',
    'PublicationDateForCommentWasImported',
    'CommentWasWithdrawn',
  ],
})

interface CommentDetails {
  readonly prereviewId?: number
  readonly authorId?: OrcidId
  readonly comment?: Html
  readonly persona?: 'public' | 'pseudonym'
  readonly competingInterests?: Option.Option<NonEmptyString.NonEmptyString>
  readonly doi?: Doi
  readonly id?: number
  readonly published: boolean
  readonly publishedAt?: Temporal.Instant
  readonly withdrawn: boolean
}

type State = HashMap.HashMap<Uuid.Uuid, CommentDetails>

const initialState: State = HashMap.empty()

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    const details = Option.getOrElse(HashMap.get(currentState, event.commentId), () => ({
      published: false,
      withdrawn: false,
    }))

    return HashMap.set(
      currentState,
      event.commentId,
      Match.valueTags(event, {
        CommentWasStarted: ({ prereviewId, authorId }) => ({ ...details, prereviewId, authorId }),
        CommentWasEntered: ({ comment }) => ({ ...details, comment }),
        PersonaForCommentWasChosen: ({ persona }) => ({ ...details, persona }),
        CompetingInterestsForCommentWereDeclared: ({ competingInterests }) => ({ ...details, competingInterests }),
        CommentWasAssignedADoi: ({ doi, id }) => ({ ...details, doi, id }),
        CommentWasPublished: ({ publishedAt }) => ({
          ...details,
          published: true,
          ...(publishedAt !== undefined ? { publishedAt } : {}),
        }),
        PublicationDateForCommentWasImported: ({ publishedAt }) => ({ ...details, publishedAt }),
        CommentWasWithdrawn: () => ({ ...details, withdrawn: true }),
      }),
    )
  })

const toPublishedComment = (
  commentId: Uuid.Uuid,
  details: CommentDetails,
): Result.Result<PublishedComment, Queries.UnexpectedSequenceOfEvents> => {
  const { authorId, comment, persona, competingInterests, doi, id, publishedAt } = details

  if (
    authorId === undefined ||
    comment === undefined ||
    persona === undefined ||
    competingInterests === undefined ||
    doi === undefined ||
    id === undefined
  ) {
    return Result.fail(new Queries.UnexpectedSequenceOfEvents({ cause: 'incomplete comment' }))
  }

  if (publishedAt === undefined) {
    return Result.fail(new Queries.UnexpectedSequenceOfEvents({ cause: 'no publication date' }))
  }

  return Result.succeed({
    authorId,
    comment,
    commentId,
    competingInterests,
    doi,
    id,
    license: 'CC-BY-4.0',
    persona,
    publishedAt,
  })
}

const byPublishedAt: Order.Order<PublishedComment> = Order.mapInput(
  Order.flip(Temporal.OrderInstant),
  comment => comment.publishedAt,
)

const query = (state: State, prereviewId: number): Result =>
  pipe(
    Array.fromIterable(state),
    Array.filter(([, details]) => details.published && !details.withdrawn && details.prereviewId === prereviewId),
    Array.map(([commentId, details]) => toPublishedComment(commentId, details)),
    Result.all,
    Result.map(Array.sort(byPublishedAt)),
  )

export const ListPublishedComments = Queries.StatefulQuery({
  name: 'Comments.getPublishedCommentsForAPrereview.ListPublishedComments',
  initialState,
  updateStateWithEvents,
  query,
})
