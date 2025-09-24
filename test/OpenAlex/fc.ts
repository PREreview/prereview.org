import type { Work } from '../../src/OpenAlex/Work.ts'
import * as fc from '../fc.ts'

export * from '../fc.ts'

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
