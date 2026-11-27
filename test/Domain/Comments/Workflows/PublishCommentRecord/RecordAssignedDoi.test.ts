import { Effect, pipe, Result } from 'effect'
import * as Comments from '../../../../../src/Domain/Comments/index.ts'
import * as _ from '../../../../../src/Domain/Comments/Workflows/PublishCommentRecord/RecordAssignedDoi.ts'
import { Doi } from '../../../../../src/types/Doi.ts'
import { Uuid } from '../../../../../src/types/index.ts'
import { expect, it, vi } from '../../../../vitest.ts'

const commentId = Uuid.Uuid('20d4a551-54fe-48e0-890b-3e08a98f54a2')
const doi = Doi('10.5072/zenodo.107286')
const id = 107286

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
      Result.fail(new Comments.UnableToPublishComment({ cause: new Comments.DoiIsAlreadyAssigned() })),
    )
  }).pipe(Effect.provideService(Comments.HandleCommentCommand, () => new Comments.DoiIsAlreadyAssigned())),
)
