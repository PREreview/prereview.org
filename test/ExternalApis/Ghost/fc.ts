import type { Ghost } from '../../../src/ExternalApis/index.js'
import * as fc from '../../fc.js'

export * from '../../fc.js'

export const ghostApi = (): fc.Arbitrary<typeof Ghost.GhostApi.Service> =>
  fc.record({
    key: fc.redacted(fc.string()),
  })
