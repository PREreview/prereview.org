import type { Prereview } from '../../src/my-prereviews-page/prereviews.js'
import * as fc from '../fc.js'

export * from '../fc.js'

export const localPrereview = (): fc.Arbitrary<Prereview> =>
  fc.record(
    {
      id: fc.integer(),
      club: fc.clubId(),
      reviewers: fc.nonEmptyArray(fc.string()),
      published: fc.plainDate(),
      fields: fc.array(fc.fieldId()),
      subfields: fc.array(fc.subfieldId()),
      preprint: fc.preprintTitle(),
    },
    { requiredKeys: ['id', 'reviewers', 'published', 'fields', 'subfields', 'preprint'] },
  )
