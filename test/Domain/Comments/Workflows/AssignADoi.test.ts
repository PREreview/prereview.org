import { Effect, Layer, Option, pipe, Result } from 'effect'
import * as Comments from '../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../src/Domain/Comments/Workflows/AssignADoi.ts'
import * as EventStore from '../../../../src/EventSourcing/EventStore.ts'
import { html } from '../../../../src/html.ts'
import * as Queries from '../../../../src/Queries.ts'
import { Doi } from '../../../../src/types/Doi.ts'
import { Uuid } from '../../../../src/types/index.ts'
import { OrcidId } from '../../../../src/types/OrcidId.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'
import { describe, expect, it, vi } from '../../../vitest.ts'

const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
const authorId = OrcidId('0000-0002-1825-0097')
const prereviewId = 123
const events = [
  new Comments.CommentWasStarted({ commentId, authorId, prereviewId }),
  new Comments.CommentWasEntered({ commentId, comment: html`Some comment` }),
  new Comments.PersonaForCommentWasChosen({ commentId, persona: 'public' }),
  new Comments.CompetingInterestsForCommentWereDeclared({ commentId, competingInterests: Option.none() }),
  new Comments.CodeOfConductForCommentWasAgreed({ commentId }),
  new Comments.PublicationOfCommentWasRequested({ commentId }),
] as const
const inputForCommentZenodoRecord: Comments.InputForCommentZenodoRecord = {
  authorId,
  prereviewId,
  comment: html`Some comment`,
  persona: 'public',
  competingInterests: Option.none(),
}
const doi = Doi('10.5072/zenodo.107286')
const eventStoreWithEvents = Layer.mock(EventStore.EventStore, {
  query: (() =>
    Effect.succeed(Option.some({ events, lastKnownPosition: EventStore.Position.make(events.length) }))) as never,
})
const id = 107286

describe('CreateRecordOnZenodo', () => {
  it.effect('creates a record', () =>
    Effect.gen(function* () {
      const createRecordOnZenodoForComment = vi.fn<typeof Comments.CreateRecordOnZenodoForComment.Service>(() =>
        Effect.succeed([doi, id]),
      )

      const actual = yield* pipe(
        _.CreateRecordOnZenodo(commentId),
        Effect.provideService(Comments.CreateRecordOnZenodoForComment, createRecordOnZenodoForComment),
        Effect.result,
      )

      expect(actual).toStrictEqual(Result.succeed([doi, id]))
      expect(createRecordOnZenodoForComment).toHaveBeenCalledWith(inputForCommentZenodoRecord)
    }).pipe(Effect.provide(eventStoreWithEvents)),
  )

  it.effect("when the comment's events can't be read", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.CreateRecordOnZenodo(commentId))

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToAssignADoi({ cause: new EventStore.FailedToGetEvents({}) })),
      )
    }).pipe(
      Effect.provide([
        Layer.mock(EventStore.EventStore, { query: () => new EventStore.FailedToGetEvents({}) }),
        Layer.succeed(Comments.CreateRecordOnZenodoForComment, shouldNotBeCalled),
      ]),
    ),
  )

  it.effect("when the comment's events don't make a record", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.CreateRecordOnZenodo(commentId))

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToAssignADoi({ cause: new Queries.UnexpectedSequenceOfEvents({}) })),
      )
    }).pipe(
      Effect.provide([
        Layer.mock(EventStore.EventStore, { query: () => Effect.succeedNone }),
        Layer.succeed(Comments.CreateRecordOnZenodoForComment, shouldNotBeCalled),
      ]),
    ),
  )

  it.effect("when a record can't be created", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.CreateRecordOnZenodo(commentId))

      expect(actual).toStrictEqual(Result.fail(new Comments.UnableToAssignADoi({})))
    }).pipe(
      Effect.provide([
        eventStoreWithEvents,
        Layer.succeed(Comments.CreateRecordOnZenodoForComment, () => new Comments.UnableToAssignADoi({})),
      ]),
    ),
  )
})

describe('RecordAssignedDoi', () => {
  it.effect('records the DOI', () =>
    Effect.gen(function* () {
      const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(() => Effect.void)

      const actual = yield* pipe(
        _.RecordAssignedDoi(commentId, doi, id),
        Effect.provideService(Comments.HandleCommentCommand, handleCommentCommand),
        Effect.result,
      )

      expect(actual).toStrictEqual(Result.void)
      expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkDoiAsAssigned({ commentId, doi, id }))
    }),
  )

  it.effect("when the DOI can't be recorded", () =>
    Effect.gen(function* () {
      const actual = yield* Effect.result(_.RecordAssignedDoi(commentId, doi, id))

      expect(actual).toStrictEqual(
        Result.fail(new Comments.UnableToAssignADoi({ cause: new Comments.DoiIsAlreadyAssigned() })),
      )
    }).pipe(Effect.provideService(Comments.HandleCommentCommand, () => new Comments.DoiIsAlreadyAssigned())),
  )
})
