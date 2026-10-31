import { Context, type Option, type Redacted } from 'effect'
import type { URL } from 'node:url'

export { PersonalDetails } from './PersonalDetails.ts'

export class OrcidApi extends Context.Service<OrcidApi, { origin: URL; token: Option.Option<Redacted.Redacted> }>()(
  'OrcidApi',
) {}
