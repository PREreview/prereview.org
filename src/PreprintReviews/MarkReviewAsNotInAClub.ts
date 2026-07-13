import type { Effect } from 'effect'
import type { UnableToHandleCommand } from '../Commands.ts'
import type { Keyv } from '../keyv.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type * as Errors from './Errors.ts'

export interface Input {
  preprintId: PreprintId
  orcidId: OrcidId
}

export type Error = Errors.PreprintReviewNotFound | UnableToHandleCommand

export declare const MarkReviewAsNotInAClub: (formStore: Keyv<unknown>) => (input: Input) => Effect.Effect<void, Error>
