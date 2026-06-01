import { Array, Data, Either, Option } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { Uuid } from '../types/Uuid.ts'

export type Input = Uuid

export type Result = Either.Either<Uuid, InvitationNotFound>

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
    onNone: () => Either.left(new InvitationNotFound()),
    onSome: ({ datasetReviewId }) => Either.right(datasetReviewId),
  })
}

export const GetReviewIdForInvitation: Queries.OnDemandQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>
> = Queries.OnDemandQuery({
  name: 'AuthorInvites.getReviewIdForInvitation',
  createFilter,
  query,
})
