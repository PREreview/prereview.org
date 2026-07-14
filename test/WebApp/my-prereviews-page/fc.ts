import { getClubName, getClubSlug } from '../../../src/Clubs/index.ts'
import { RecentDatasetPrereview, RecentPreprintPrereview } from '../../../src/Prereviews/Prereview.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import type { Prereview } from '../../../src/WebApp/my-prereviews-page/prereviews.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const localPrereview = (): fc.Arbitrary<Prereview> =>
  fc.oneof(
    fc
      .record(
        {
          id: fc.integer(),
          club: fc.clubId().map(id => ({
            id: Uuid(id),
            name: getClubName(id).text,
            language: getClubName(id).language,
            slug: getClubSlug(id),
          })),
          reviewers: fc.record({ named: fc.nonEmptyArray(fc.name()), anonymous: fc.integer({ min: 0 }) }),
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
        otherAuthors: fc.array(fc.persona()),
        anonymousAuthors: fc.integer({ min: 0 }),
        published: fc.plainDate(),
        dataset: fc.datasetTitle(),
      })
      .map(args => new RecentDatasetPrereview(args)),
  )
