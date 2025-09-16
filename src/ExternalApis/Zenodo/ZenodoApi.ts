import { Context, type Redacted } from 'effect'

export class ZenodoApi extends Context.Tag('ZenodoApi')<ZenodoApi, { key: Redacted.Redacted; origin: URL }>() {}
