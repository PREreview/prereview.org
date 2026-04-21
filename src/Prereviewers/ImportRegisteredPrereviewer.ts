import { Array, Data, Either, Option } from 'effect'
import type * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { Pseudonym, Temporal } from '../types/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'

export interface Input {
  readonly orcidId: OrcidId
  readonly registeredAt: Temporal.Instant | 'not available from import source'
  readonly pseudonym: Pseudonym.Pseudonym
}

interface State {
  readonly byOrcid: Record<
    Events.RegisteredPrereviewerImported['orcidId'],
    {
      pseudonym: Events.RegisteredPrereviewerImported['pseudonym']
      registeredAt: Events.RegisteredPrereviewerImported['registeredAt']
    }
  >
  readonly byPseudonym: Record<
    Events.RegisteredPrereviewerImported['pseudonym'],
    Events.RegisteredPrereviewerImported['orcidId']
  >
}

export class PseudonymAlreadyInUse extends Data.TaggedError('PseudonymAlreadyInUse') {}

export class MismatchWithExistingDataForOrcid extends Data.TaggedError('MismatchWithExistingDataForOrcid')<{
  existingPseudonym: Pseudonym.Pseudonym
  existingRegisteredAt: Temporal.Instant | 'not available from import source'
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
  const byOrcid: State['byOrcid'] = {}
  const byPseudonym: State['byPseudonym'] = {}

  for (const event of filteredEvents) {
    byOrcid[event.orcidId] = { pseudonym: event.pseudonym, registeredAt: event.registeredAt }
    byPseudonym[event.pseudonym] = event.orcidId
  }

  return { byOrcid, byPseudonym }
}

const pseudonymInUseByOther = (input: Input, state: State) => {
  const existingPseudonymUsage = state.byPseudonym[input.pseudonym]

  if (!existingPseudonymUsage) {
    return false
  }

  if (existingPseudonymUsage === input.orcidId) {
    return false
  }

  return true
}

const existingRecordMatches = (existing: State['byOrcid'][OrcidId], input: Input) => {
  if (existing.pseudonym !== input.pseudonym) {
    return false
  }

  if (existing.registeredAt === 'not available from import source') {
    return input.registeredAt === 'not available from import source'
  }

  if (input.registeredAt === 'not available from import source') {
    return false
  }

  if (!existing.registeredAt.equals(input.registeredAt)) {
    return false
  }
  return true
}

const decide = (
  state: State,
  input: Input,
): Either.Either<Option.Option<Events.Event>, PseudonymAlreadyInUse | MismatchWithExistingDataForOrcid> => {
  if (pseudonymInUseByOther(input, state)) {
    return Either.left(new PseudonymAlreadyInUse())
  }

  const existing = state.byOrcid[input.orcidId]

  if (!existing) {
    return Either.right(Option.some(new Events.RegisteredPrereviewerImported(input)))
  }

  if (!existingRecordMatches(existing, input)) {
    return Either.left(
      new MismatchWithExistingDataForOrcid({
        existingPseudonym: existing.pseudonym,
        existingRegisteredAt: existing.registeredAt,
      }),
    )
  }

  return Either.right(Option.none())
}

export const ImportRegisteredPrereviewer: Commands.Command<
  'RegisteredPrereviewerImported',
  [Input],
  State,
  PseudonymAlreadyInUse | MismatchWithExistingDataForOrcid
> = {
  name: 'ImportRegisteredPrereviewer',
  createFilter,
  foldState,
  decide,
}
