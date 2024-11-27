import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import type { PseudonymProfileId } from '../types/profile-id.js'
import type { Pseudonym } from '../types/pseudonym.js'
import { type Prereviews, getPrereviews } from './prereviews.js'

export interface PseudonymProfile {
  type: 'pseudonym'
  name: Pseudonym
  prereviews: Prereviews
}

export function getPseudonymProfile(profileId: PseudonymProfileId) {
  return pipe(
    RTE.Do,
    RTE.let('type', () => 'pseudonym' as const),
    RTE.let('name', () => profileId.pseudonym),
    RTE.apS('prereviews', getPrereviews(profileId)),
  ) satisfies RTE.ReaderTaskEither<any, any, PseudonymProfile> // eslint-disable-line @typescript-eslint/no-explicit-any
}
