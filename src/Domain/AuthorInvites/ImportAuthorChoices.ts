import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Instant } from '../../types/Temporal.ts'

export interface Input {
  readonly reviewId: number
  readonly orcidId: OrcidId
  readonly persona: 'public' | 'pseudonym'
  readonly confirmedAt: Instant
}

const decide = (input: Input): Events.Event =>
  new Events.AuthorChoicesForAReviewImported({
    reviewId: input.reviewId,
    orcidId: input.orcidId,
    persona: input.persona,
    confirmedAt: input.confirmedAt,
  })

export const ImportAuthorChoices = Commands.StatelessCommand({
  name: 'AuthorInvites.importAuthorChoices',
  decide,
})
