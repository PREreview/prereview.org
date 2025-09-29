import { Context, type Redacted } from 'effect'

export class SlackApi extends Context.Tag('SlackApi')<
  SlackApi,
  { apiToken: Redacted.Redacted; apiUpdate: boolean }
>() {}
