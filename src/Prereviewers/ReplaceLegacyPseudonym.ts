import { Array, Data, Either, Match, Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId, Pseudonym, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly replacedAt: Temporal.Instant
  readonly pseudonym: Pseudonym.Pseudonym
}

type State = PrereviewerImported | PrereviewerRegistered | PrereviewerNotRegistered | PseudonymAlreadyInUse

class PrereviewerImported extends Data.TaggedClass('PrereviewerImported')<{
  pseudonym: Pseudonym.Pseudonym
}> {}

class PrereviewerRegistered extends Data.TaggedClass('PrereviewerRegistered') {}

export type Error = PseudonymAlreadyInUse | PrereviewerDoesNotHaveLegacyPseudonym | PrereviewerNotRegistered

export class PseudonymAlreadyInUse extends Data.TaggedError('PseudonymAlreadyInUse') {}

export class PrereviewerDoesNotHaveLegacyPseudonym extends Data.TaggedError('PrereviewerDoesNotHaveLegacyPseudonym') {}

export class PrereviewerNotRegistered extends Data.TaggedError('PrereviewerNotRegistered') {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered', 'LegacyPseudonymReplaced'],
      predicates: { pseudonym: input.pseudonym },
    },
    {
      types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered', 'LegacyPseudonymReplaced'],
      predicates: { orcidId: input.orcidId },
    },
  ])

const isPseudonymRegisteredToDifferentOrcidId = (
  input: Input,
  event: Events.RegisteredPrereviewerImported | Events.PrereviewerRegistered | Events.LegacyPseudonymReplaced,
) => event.pseudonym === input.pseudonym && event.orcidId !== input.orcidId

const isPrereviewerRegistered = (events: ReadonlyArray<Events.Event>, input: Input) =>
  Array.some(events, event => event._tag === 'PrereviewerRegistered' && event.orcidId === input.orcidId)

const findImportOfPrereviewer = (events: ReadonlyArray<Events.Event>, input: Input) =>
  Array.findFirst(
    events,
    (event): event is Events.RegisteredPrereviewerImported =>
      event._tag === 'RegisteredPrereviewerImported' && event.orcidId === input.orcidId,
  )

const getCurrentPseudonym = (events: ReadonlyArray<Events.Event>, input: Input) =>
  Array.findLast(events, event =>
    (event._tag === 'RegisteredPrereviewerImported' || event._tag === 'LegacyPseudonymReplaced') &&
    event.orcidId === input.orcidId
      ? Option.some(event.pseudonym)
      : Option.none(),
  )

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (Array.some(filteredEvents, event => isPseudonymRegisteredToDifferentOrcidId(input, event))) {
    return new PseudonymAlreadyInUse()
  }

  if (isPrereviewerRegistered(filteredEvents, input)) {
    return new PrereviewerRegistered()
  }

  const imported = findImportOfPrereviewer(filteredEvents, input)
  if (Option.isSome(imported)) {
    const pseudonym = Option.getOrThrow(getCurrentPseudonym(filteredEvents, input))

    return new PrereviewerImported({ pseudonym })
  }

  return new PrereviewerNotRegistered()
}

const decide =
  (possiblePseudonyms: Set<Pseudonym.Pseudonym>) =>
  (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
    Match.valueTags(state, {
      PrereviewerImported: state => {
        if (state.pseudonym === input.pseudonym) {
          return Either.right(Option.none())
        }
        console.log(state.pseudonym, input.pseudonym, possiblePseudonyms)
        if (possiblePseudonyms.has(state.pseudonym)) {
          return Either.left(new PrereviewerDoesNotHaveLegacyPseudonym())
        }

        return Either.right(Option.some(new Events.LegacyPseudonymReplaced(input)))
      },
      PrereviewerRegistered: () => Either.left(new PrereviewerDoesNotHaveLegacyPseudonym()),
      PrereviewerNotRegistered: state => Either.left(state),
      PseudonymAlreadyInUse: state => Either.left(state),
    })

export const ReplaceLegacyPseudonym = (possiblePseudonyms: Set<Pseudonym.Pseudonym>) =>
  Commands.Command({
    name: 'Prereviewers.replaceLegacyPseudonym',
    createFilter,
    foldState,
    decide: decide(possiblePseudonyms),
  })
