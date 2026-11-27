import { Schema } from 'effect'
import { Doi, Uuid } from '../../types/index.ts'

export type PublishedRecord = typeof PublishedRecord.Type

export const PublishedRecord = Schema.Struct({
  id: Schema.FiniteFromString.check(Schema.isInt()),
  pids: Schema.Struct({ doi: Schema.Struct({ identifier: Doi.DoiSchema }) }),
  parent: Schema.Struct({
    communities: Schema.Struct({ ids: Schema.optionalKey(Schema.Array(Uuid.UuidSchema)) }),
  }),
})
