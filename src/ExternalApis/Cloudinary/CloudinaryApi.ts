import { Context, type Redacted } from 'effect'

export class CloudinaryApi extends Context.Service<
  CloudinaryApi,
  { cloudName: string; key: Redacted.Redacted; secret: Redacted.Redacted }
>()('CloudinaryApi') {}
