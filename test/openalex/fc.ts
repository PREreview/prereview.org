import type { Work } from '../../src/openalex/work'
import * as fc from '../fc'

export * from '../fc'

export const work = ({ topics }: { topics?: fc.Arbitrary<Work['topics']> } = {}): fc.Arbitrary<Work> =>
  fc.record({
    topics: topics ?? fc.array(fc.record({ field: fc.record({ id: fc.url() }) })),
  })
