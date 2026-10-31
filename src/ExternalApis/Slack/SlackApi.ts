import { Context, type Redacted } from 'effect'

export class SlackApi extends Context.Service<SlackApi, { apiToken: Redacted.Redacted }>()('SlackApi') {}
