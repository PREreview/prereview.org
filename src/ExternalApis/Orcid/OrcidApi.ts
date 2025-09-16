import { Context, type Option, type Redacted } from 'effect'
import type { URL } from 'url'

export class OrcidApi extends Context.Tag('OrcidApi')<
  OrcidApi,
  { origin: URL; token: Option.Option<Redacted.Redacted> }
>() {}
