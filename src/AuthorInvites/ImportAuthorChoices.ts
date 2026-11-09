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

declare const decide: (input: Input) => Events.Event

export const ImportAuthorChoices = Commands.StatelessCommand({
  name: 'AuthorInvites.importAuthorChoices',
  decide,
})
