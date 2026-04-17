import { Array, Data, Either, Option } from 'effect'
import type * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { Pseudonym, Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly registeredAt: Temporal.Instant
  readonly pseudonym: Pseudonym.Pseudonym
}

interface State {
  readonly byOrcid: Record<string, { pseudonym: Pseudonym.Pseudonym; registeredAt: Temporal.Instant }>
  readonly byPseudonym: Record<string, OrcidId>
}

export class PseudonymAlreadyInUse extends Data.TaggedError('PseudonymAlreadyInUse') {}

export class MismatchWithExistingDataForOrcid extends Data.TaggedError('MismatchWithExistingDataForOrcid')<{
  existingPseudonym: Pseudonym.Pseudonym
  existingRegisteredAt: Temporal.Instant
}> {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['RegisteredPrereviewerImported'],
      predicates: { pseudonym: input.pseudonym },
    },
    {
      types: ['RegisteredPrereviewerImported'],
      predicates: { orcidId: input.orcidId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))
  const byOrcid: Record<string, { pseudonym: Pseudonym.Pseudonym; registeredAt: Temporal.Instant }> = {}
  const byPseudonym: Record<string, OrcidId> = {}

  for (const event of filteredEvents) {
    byOrcid[event.orcidId] = { pseudonym: event.pseudonym, registeredAt: event.registeredAt }
    byPseudonym[event.pseudonym] = event.orcidId
  }

  return { byOrcid, byPseudonym }
}

const decide = (
  state: State,
  input: Input,
): Either.Either<Option.Option<Events.Event>, PseudonymAlreadyInUse | MismatchWithExistingDataForOrcid> => {
  const existing = state.byOrcid[input.orcidId]
  if (existing) {
    if (existing.pseudonym === input.pseudonym && existing.registeredAt.equals(input.registeredAt)) {
      return Either.right(Option.none())
    } else {
      return Either.left(
        new MismatchWithExistingDataForOrcid({
          existingPseudonym: existing.pseudonym,
          existingRegisteredAt: existing.registeredAt,
        }),
      )
    }
  }

  const pseudonymUsedBy = state.byPseudonym[input.pseudonym]
  if (pseudonymUsedBy && pseudonymUsedBy !== input.orcidId) {
    return Either.left(new PseudonymAlreadyInUse())
  }

  return Either.right(Option.some(new Events.RegisteredPrereviewerImported(input)))
}

export const ImportRegisteredPrereviewer: Commands.Command<
  'RegisteredPrereviewerImported',
  [Input],
  State,
  PseudonymAlreadyInUse | MismatchWithExistingDataForOrcid
> = {
  name: 'RegisteredPrereviewerImported',
  createFilter,
  foldState,
  decide,
}
