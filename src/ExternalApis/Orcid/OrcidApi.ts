import { Context, type Option, type Redacted } from 'effect'
import type { URL } from 'url'

export { PersonalDetails } from './PersonalDetails.ts'

export class OrcidApi extends Context.Tag('OrcidApi')<
  OrcidApi,
  { origin: URL; token: Option.Option<Redacted.Redacted> }
>() {}
