import type { Temporal } from '@js-temporal/polyfill'
import type * as Preprints from '../../Preprints/index.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'

export interface Command {
  readonly publishedAt: Temporal.Instant
  readonly preprintId: Preprints.IndeterminatePreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly persona: 'public' | 'pseudonym'
    readonly orcidId: OrcidId.OrcidId
  }
}
