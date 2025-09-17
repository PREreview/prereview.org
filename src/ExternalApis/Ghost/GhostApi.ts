import { Context, type Redacted } from 'effect'

export class GhostApi extends Context.Tag('GhostApi')<GhostApi, { key: Redacted.Redacted }>() {}
