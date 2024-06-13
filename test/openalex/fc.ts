import type { Work } from '../../src/openalex/work.js'
import * as fc from '../fc.js'

export * from '../fc.js'

export const work = ({ topics }: { topics?: fc.Arbitrary<Work['topics']> } = {}): fc.Arbitrary<Work> =>
  fc.record({
    topics:
      topics ??
      fc.array(
        fc.record({
          display_name: fc.string(),
          id: fc.url(),
          subfield: fc.record({ display_name: fc.string(), id: fc.url() }),
          field: fc.record({ display_name: fc.string(), id: fc.url() }),
          domain: fc.record({ display_name: fc.string(), id: fc.url() }),
        }),
      ),
  })
