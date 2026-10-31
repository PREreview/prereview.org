import { Array, Data, Result, Option } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Uuid } from '../types/Uuid.ts'

export type Input = Uuid

export type Result = Result.Result<Uuid, InvitationNotFound>

export class InvitationNotFound extends Data.TaggedError('InvitationNotFound') {}

const createFilter = (invitationId: Input) =>
  Events.EventFilter({
    types: ['InvitationToAppearOnADatasetReviewAddedToTheList'],
    predicates: { invitationId },
  })

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  return Option.match(Array.last(filteredEvents), {
    onNone: () => Result.fail(new InvitationNotFound()),
    onSome: ({ datasetReviewId }) => Result.succeed(datasetReviewId),
  })
}

export const GetReviewIdForInvitation: Queries.OnDemandQuery<
  [Input],
  Result.Result.Success<Result>,
  Result.Result.Failure<Result>
> = Queries.OnDemandQuery({
  name: 'AuthorInvites.getReviewIdForInvitation',
  createFilter,
  query,
})
