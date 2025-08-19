import { Context, type Redacted } from 'effect'

export class CloudinaryApi extends Context.Tag('CloudinaryApi')<
  CloudinaryApi,
  { cloudName: string; key: Redacted.Redacted; secret: Redacted.Redacted }
>() {}
