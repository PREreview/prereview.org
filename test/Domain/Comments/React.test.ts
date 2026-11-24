import { Effect, pipe, Result } from 'effect'
import * as Comments from '../../../src/Domain/Comments/index.ts'
import * as _ from '../../../src/Domain/Comments/React.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import { describe, expect, it, vi } from '../../vitest.ts'

describe('AssignCommentADoiWhenPublicationWasRequested', () => {
  it.effect.prop(
    'assigns a DOI',
    [fc.uuid(), fc.inputForCommentZenodoRecord(), fc.integer(), fc.doi()],
    ([commentId, inputForCommentZenodoRecord, id, doi]) =>
      Effect.gen(function* () {
        const handleCommentCommand = vi.fn<typeof Comments.HandleCommentCommand.Service>(() => Effect.void)

        yield* Effect.provideService(
          _.AssignCommentADoiWhenPublicationWasRequested({
            commentId,
            inputForCommentZenodoRecord,
          }),
          Comments.HandleCommentCommand,
          handleCommentCommand,
        )

        expect(handleCommentCommand).toHaveBeenCalledWith(new Comments.MarkDoiAsAssigned({ commentId, doi, id }))
      }).pipe(Effect.provideService(Comments.CreateRecordOnZenodoForComment, () => Effect.succeed([doi, id]))),
  )

  it.effect.prop(
    "when the command can't be handled",
    [fc.uuid(), fc.inputForCommentZenodoRecord(), fc.integer(), fc.doi(), fc.commentError()],
    ([commentId, inputForCommentZenodoRecord, id, doi, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
          Effect.provideService(Comments.HandleCommentCommand, () => error),
          Effect.result,
        )

        expect(actual).toStrictEqual(Result.fail(error))
      }).pipe(Effect.provideService(Comments.CreateRecordOnZenodoForComment, () => Effect.succeed([doi, id]))),
  )

  it.effect.prop(
    "when a DOI can't be assigned",
    [fc.uuid(), fc.inputForCommentZenodoRecord()],
    ([commentId, inputForCommentZenodoRecord]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AssignCommentADoiWhenPublicationWasRequested({ commentId, inputForCommentZenodoRecord }),
          Effect.provideService(Comments.CreateRecordOnZenodoForComment, () =>
            Effect.fail(new Comments.UnableToAssignADoi({})),
          ),
          Effect.provideService(Comments.PublishCommentOnZenodo, shouldNotBeCalled),
          Effect.provideService(Comments.HandleCommentCommand, shouldNotBeCalled),
          Effect.result,
        )

        expect(actual).toStrictEqual(Result.fail(new Comments.UnableToAssignADoi({})))
      }),
  )
})
