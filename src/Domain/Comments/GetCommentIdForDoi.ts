import { Array, Data, Result } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import { Doi, type Uuid } from '../../types/index.ts'

export type Input = Doi.Doi

export type Result = Result.Result<Uuid.Uuid, CommentIsNotFound>

export class CommentIsNotFound extends Data.TaggedError('CommentIsNotFound') {}

const filter = Events.EventFilter({ types: ['CommentWasAssignedADoi'] })

const createFilter = () => filter

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Result.gen(function* () {
    const assignedDoi = yield* Result.fromOption(
      Array.findLast(Array.filter(events, Events.matches(filter)), event => Doi.DoiEquivalence(event.doi, input)),
      () => new CommentIsNotFound(),
    )

    return assignedDoi.commentId
  })

export const GetCommentIdForDoi = Queries.OnDemandQuery<[Input], Uuid.Uuid, CommentIsNotFound>({
  name: 'Comments.getCommentIdForDoi',
  createFilter,
  query,
})
