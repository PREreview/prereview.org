import { Array, Boolean, Data, Either, Equal, Match, Option, type Types } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Input {
  readonly persona: 'public' | 'pseudonym'
  readonly reviewRequestId: Uuid.Uuid
}

export type Error = Errors.UnknownReviewRequest | Errors.ReviewRequestHasBeenPublished

type State = NotStarted | NotChosen | HasBeenChosen | HasBeenPublished

class NotStarted extends Data.TaggedClass('NotStarted') {}

class NotChosen extends Data.TaggedClass('NotChosen') {}

class HasBeenChosen extends Data.TaggedClass('HasBeenChosen')<{
  persona: 'public' | 'pseudonym'
}> {}

class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: [
      'ReviewRequestForAPreprintWasStarted',
      'PersonaForAReviewRequestForAPreprintWasChosen',
      'ReviewRequestForAPreprintWasPublished',
    ],
    predicates: { reviewRequestId: input.reviewRequestId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (!Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasStarted'))) {
    return new NotStarted()
  }

  if (Array.some(filteredEvents, hasTag('ReviewRequestForAPreprintWasPublished'))) {
    return new HasBeenPublished()
  }

  return Option.match(Array.findLast(filteredEvents, hasTag('PersonaForAReviewRequestForAPreprintWasChosen')), {
    onNone: () => new NotChosen(),
    onSome: ({ persona }) => new HasBeenChosen({ persona }),
  })
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.ReviewRequestEvent>, Error> =>
  Match.valueTags(state, {
    NotStarted: () => Either.left(new Errors.UnknownReviewRequest({})),
    NotChosen: () =>
      Either.right(
        Option.some(
          new Events.PersonaForAReviewRequestForAPreprintWasChosen({
            persona: input.persona,
            reviewRequestId: input.reviewRequestId,
          }),
        ),
      ),
    HasBeenChosen: ({ persona }) =>
      Boolean.match(Equal.equals(input.persona, persona), {
        onTrue: () => Either.right(Option.none()),
        onFalse: () =>
          Either.right(
            Option.some(
              new Events.PersonaForAReviewRequestForAPreprintWasChosen({
                persona: input.persona,
                reviewRequestId: input.reviewRequestId,
              }),
            ),
          ),
      }),
    HasBeenPublished: () => Either.left(new Errors.ReviewRequestHasBeenPublished({})),
  })

export const ChoosePersona = Commands.Command({
  name: 'ReviewRequestCommands.choosePersona',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
