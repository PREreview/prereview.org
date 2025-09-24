import type { OrcidApi } from '../../../src/ExternalApis/Orcid/OrcidApi.ts'
import * as fc from '../../fc.ts'

export * from '../../fc.ts'

export const orcidApi = (): fc.Arbitrary<typeof OrcidApi.Service> =>
  fc.record({
    origin: fc.origin(),
    token: fc.maybe(fc.redacted(fc.string())),
  })
