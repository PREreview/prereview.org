import { Array, Data, Result, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Result.Result<{ persona: 'public' | 'pseudonym' }, Error>

export type Error = PrereviewerIsNotListedOnTheReview | ChoicesHaveBeenConfirmed | PersonaHasNotBeenChosen

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

export class ChoicesHaveBeenConfirmed extends Data.TaggedError('ChoicesHaveBeenConfirmed') {}

export class PersonaHasNotBeenChosen extends Data.TaggedError('PersonaHasNotBeenChosen') {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen', 'AuthorChoicesForAReviewConfirmed'],
      predicates: { reviewId: input.reviewId, orcidId: input.orcidId },
    },
    {
      types: ['DatasetReviewWasStarted'],
      predicates: { datasetReviewId: input.reviewId, authorId: input.orcidId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    if (Array.isArrayEmpty(filteredEvents)) {
      return yield* Result.fail(new PrereviewerIsNotListedOnTheReview())
    }

    if (Array.some(filteredEvents, hasTag('DatasetReviewWasStarted'))) {
      return yield* Result.fail(new ChoicesHaveBeenConfirmed())
    }

    if (Array.some(filteredEvents, hasTag('AuthorChoicesForAReviewConfirmed'))) {
      return yield* Result.fail(new ChoicesHaveBeenConfirmed())
    }

    return yield* Option.match(Array.findLast(filteredEvents, hasTag('PersonaForAReviewChosen')), {
      onNone: () => Result.fail(new PersonaHasNotBeenChosen()),
      onSome: ({ persona }) => Result.succeed({ persona }),
    })
  })

export const GetAuthorChoicesToConfirm: Queries.OnDemandQuery<
  [Input],
  Result.Result.Success<Result>,
  Result.Result.Failure<Result>
> = Queries.OnDemandQuery({
  name: 'AuthorInvites.getAuthorChoicesToConfirm',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
