import { Context, type Redacted } from 'effect'

export class ZenodoApi extends Context.Service<ZenodoApi, { key: Redacted.Redacted; origin: URL }>()('ZenodoApi') {}
