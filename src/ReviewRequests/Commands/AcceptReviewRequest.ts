import type { Temporal } from '@js-temporal/polyfill'
import type * as Preprints from '../../Preprints/index.ts'
import type { NonEmptyString, Uuid } from '../../types/index.ts'

export interface Command {
  readonly receivedAt: Temporal.Instant
  readonly acceptedAt: Temporal.Instant
  readonly preprintId: Preprints.PreprintId
  readonly reviewRequestId: Uuid.Uuid
  readonly requester: {
    readonly name: NonEmptyString.NonEmptyString
  }
}
