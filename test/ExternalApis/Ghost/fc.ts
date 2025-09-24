import type { Ghost } from '../../../src/ExternalApis/index.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const ghostApi = (): fc.Arbitrary<typeof Ghost.GhostApi.Service> =>
  fc.record({
    key: fc.redacted(fc.string()),
  })
