import type { Result, Option } from 'effect'
import * as Commands from '../Commands.ts'
import type * as Events from '../Events.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Instant } from '../types/Temporal.ts'

export interface Input {
  readonly reviewId: number
  readonly orcidId: OrcidId
  readonly persona: 'public' | 'pseudonym'
  readonly confirmedAt: Instant
}

export type Error = unknown

type State = unknown

declare const createFilter: (input: Input) => Events.EventFilter

declare const foldState: (events: ReadonlyArray<Events.Event>, input: Input) => State

declare const decide: (state: State, input: Input) => Result.Result<Option.Option<Events.Event>, Error>

export const ImportAuthorChoices = Commands.Command({
  name: 'AuthorInvites.importAuthorChoices',
  createFilter,
  foldState,
  decide,
})
