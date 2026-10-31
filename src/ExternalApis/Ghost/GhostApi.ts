import { Context, type Redacted } from 'effect'

export class GhostApi extends Context.Service<GhostApi, { key: Redacted.Redacted }>()('GhostApi') {}
