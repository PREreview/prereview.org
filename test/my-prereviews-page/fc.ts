import type { Prereview } from '../../src/my-prereviews-page/prereviews'
import * as fc from '../fc'

export * from '../fc'

export const prereview = (): fc.Arbitrary<Prereview> =>
  fc.record(
    {
      id: fc.integer(),
      club: fc.clubId(),
      reviewers: fc.nonEmptyArray(fc.string()),
      published: fc.plainDate(),
      preprint: fc.preprintTitle(),
    },
    { requiredKeys: ['id', 'reviewers', 'published', 'preprint'] },
  )
