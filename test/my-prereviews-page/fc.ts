import type { Prereview } from '../../src/my-prereviews-page/prereviews.ts'
import { RecentDatasetPrereview, RecentPreprintPrereview } from '../../src/Prereviews/Prereview.ts'
import * as fc from '../fc.ts'

export * from '../fc.ts'

export const localPrereview = (): fc.Arbitrary<Prereview> =>
  fc.oneof(
    fc
      .record(
        {
          id: fc.integer(),
          club: fc.clubId(),
          reviewers: fc.record({ named: fc.nonEmptyArray(fc.string()), anonymous: fc.integer({ min: 0 }) }),
          published: fc.plainDate(),
          fields: fc.array(fc.fieldId()),
          subfields: fc.array(fc.subfieldId()),
          preprint: fc.preprintTitle(),
        },
        { requiredKeys: ['id', 'reviewers', 'published', 'fields', 'subfields', 'preprint'] },
      )
      .map(args => new RecentPreprintPrereview(args)),
    fc
      .record({
        id: fc.uuid(),
        doi: fc.doi(),
        author: fc.persona(),
        published: fc.plainDate(),
        dataset: fc.datasetTitle(),
      })
      .map(args => new RecentDatasetPrereview(args)),
  )
