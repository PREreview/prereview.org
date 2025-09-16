import type { OrcidApi } from '../../../src/ExternalApis/Orcid/OrcidApi.js'
import * as fc from '../../fc.js'

export * from '../../fc.js'

export const orcidApi = (): fc.Arbitrary<typeof OrcidApi.Service> =>
  fc.record({
    origin: fc.origin(),
    token: fc.maybe(fc.redacted(fc.string())),
  })
