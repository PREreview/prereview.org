import { Array, Data, Either, Match, Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { Pseudonym, Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly registeredAt: Temporal.Instant
  readonly pseudonym: Pseudonym.Pseudonym
}

type State = PrereviewerNotRegistered | PrereviewerAlreadyRegistered | PseudonymAlreadyInUse

class PrereviewerNotRegistered extends Data.TaggedClass('PrereviewerNotRegistered') {}

class PrereviewerAlreadyRegistered extends Data.TaggedClass('PrereviewerAlreadyRegistered')<{
  registeredAt: Temporal.Instant | 'not available from import source'
  pseudonym: Pseudonym.Pseudonym
}> {}

export class PseudonymAlreadyInUse extends Data.TaggedError('PseudonymAlreadyInUse') {}

export class MismatchWithExistingDataForOrcid extends Data.TaggedError('MismatchWithExistingDataForOrcid')<{
  existingPseudonym: Pseudonym.Pseudonym
  existingRegisteredAt: Temporal.Instant | 'not available from import source'
}> {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered', 'LegacyPseudonymReplaced'],
      predicates: { pseudonym: input.pseudonym },
    },
    {
      types: ['RegisteredPrereviewerImported', 'PrereviewerRegistered'],
      predicates: { orcidId: input.orcidId },
    },
  ])

const isPseudonymRegisteredToDifferentOrcidId = (
  input: Input,
  event: Events.RegisteredPrereviewerImported | Events.PrereviewerRegistered | Events.LegacyPseudonymReplaced,
) => event.pseudonym === input.pseudonym && event.orcidId !== input.orcidId

const isPrereviewerRegistered = (
  input: Input,
  event: Events.RegisteredPrereviewerImported | Events.PrereviewerRegistered | Events.LegacyPseudonymReplaced,
): event is Events.RegisteredPrereviewerImported | Events.PrereviewerRegistered =>
  event.orcidId === input.orcidId && event._tag !== 'LegacyPseudonymReplaced'

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (Array.some(filteredEvents, event => isPseudonymRegisteredToDifferentOrcidId(input, event))) {
    return new PseudonymAlreadyInUse()
  }

  const alreadyRegistered = Array.findFirst(filteredEvents, event => isPrereviewerRegistered(input, event))
  if (Option.isSome(alreadyRegistered)) {
    return new PrereviewerAlreadyRegistered({
      registeredAt: alreadyRegistered.value.registeredAt,
      pseudonym: alreadyRegistered.value.pseudonym,
    })
  }

  return new PrereviewerNotRegistered()
}

const decide = (state: State, input: Input) =>
  Match.valueTags(state, {
    PseudonymAlreadyInUse: state => Either.left(state),
    PrereviewerAlreadyRegistered: existing => {
      if (existing.registeredAt !== input.registeredAt || existing.pseudonym !== input.pseudonym) {
        return Either.left(
          new MismatchWithExistingDataForOrcid({
            existingPseudonym: existing.pseudonym,
            existingRegisteredAt: existing.registeredAt,
          }),
        )
      }

      return Either.right(Option.none())
    },
    PrereviewerNotRegistered: () => Either.right(Option.some(new Events.PrereviewerRegistered(input))),
  })

export const RegisterPrereviewer = Commands.Command({
  name: 'Prereviewers.registerPrereviewer',
  createFilter,
  foldState,
  decide,
})
