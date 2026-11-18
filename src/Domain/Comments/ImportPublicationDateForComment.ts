import { Array, Data, Match, type Option, Result } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { Temporal } from '../../types/index.ts'
import type { Uuid } from '../../types/Uuid.ts'

export type Input = Omit<typeof Events.PublicationDateForCommentWasImported.Type, '_tag'>

export class CommentIsNotPublished extends Data.TaggedError('CommentIsNotPublished') {}

export class UnexpectedPublicationDate extends Data.TaggedError('UnexpectedPublicationDate') {}

export type Error = CommentIsNotPublished | UnexpectedPublicationDate

type State = NotPublished | PublishedWithoutADate | PublishedWithADate

class NotPublished extends Data.TaggedClass('NotPublished') {}

class PublishedWithoutADate extends Data.TaggedClass('PublishedWithoutADate') {}

class PublishedWithADate extends Data.TaggedClass('PublishedWithADate')<{ publishedAt: Temporal.Instant }> {}

const createFilter = ({ commentId }: { commentId: Uuid }) =>
  Events.EventFilter({
    types: ['CommentWasPublished', 'PublicationDateForCommentWasImported'],
    predicates: { commentId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State =>
  Array.reduce(Array.filter(events, Events.matches(createFilter(input))), new NotPublished() as State, (state, event) =>
    Match.valueTags(event, {
      CommentWasPublished: ({ publishedAt }) =>
        publishedAt === undefined ? new PublishedWithoutADate() : new PublishedWithADate({ publishedAt }),
      PublicationDateForCommentWasImported: ({ publishedAt }) => new PublishedWithADate({ publishedAt }),
    }),
  )

const decide = (state: State, input: Input): Result.Result<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    NotPublished: () => Result.fail(new CommentIsNotPublished()),
    PublishedWithoutADate: () => Result.succeedSome(new Events.PublicationDateForCommentWasImported(input)),
    PublishedWithADate: ({ publishedAt }) =>
      publishedAt.equals(input.publishedAt) ? Result.succeedNone : Result.fail(new UnexpectedPublicationDate()),
  })

export const ImportPublicationDateForComment = Commands.Command({
  name: 'Comments.importPublicationDateForComment',
  createFilter,
  foldState,
  decide,
})
