import { Array, Match, Option, Result, Schema } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import { type Uuid, UuidSchema } from '../../types/Uuid.ts'
import * as Errors from './Errors.ts'

export type Input = typeof Input.Type

const Input = Schema.Struct({
  preprintReviewId: Schema.Int,
  clubId: UuidSchema,
})

export type Error = Errors.PreprintReviewHasAlreadyBeenAddedToAClub | Errors.PreprintReviewNotFound | Errors.UnknownClub

interface State {
  readonly published: boolean
  readonly inClub: Option.Option<Uuid>
}

const createFilter = (input: Input) =>
  Events.EventFilter([
    { types: ['PreprintReviewImported'], predicates: { id: input.preprintReviewId } },
    { types: ['PreprintReviewWasAddedToAClub'], predicates: { preprintReviewId: input.preprintReviewId } },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State =>
  Array.reduce(
    Array.filter(events, Events.matches(createFilter(input))),
    { published: false, inClub: Option.none() },
    (state: State, event): State =>
      Match.valueTags(event, {
        PreprintReviewImported: imported => ({ published: true, inClub: Option.fromUndefinedOr(imported.club) }),
        PreprintReviewWasAddedToAClub: added => ({ ...state, inClub: Option.some(added.clubId) }),
      }),
  )

const decide =
  (clubs: ReadonlyArray<Uuid>) =>
  (state: State, input: Input): Result.Result<Option.Option<Events.Event>, Error> =>
    Result.gen(function* () {
      if (!state.published) {
        return yield* Result.fail(new Errors.PreprintReviewNotFound({}))
      }

      if (Option.isSome(state.inClub)) {
        if (state.inClub.value !== input.clubId) {
          return yield* Result.fail(new Errors.PreprintReviewHasAlreadyBeenAddedToAClub())
        }

        return Option.none()
      }

      if (!Array.contains(clubs, input.clubId)) {
        return yield* Result.fail(new Errors.UnknownClub())
      }

      return Option.some(new Events.PreprintReviewWasAddedToAClub(input))
    })

export const AddPublishedReviewToAClub = (clubs: ReadonlyArray<Uuid>) =>
  Commands.Command({
    name: 'PreprintReviews.addPublishedReviewToAClub',
    inputSchema: Input,
    createFilter,
    foldState,
    decide: decide(clubs),
  })
