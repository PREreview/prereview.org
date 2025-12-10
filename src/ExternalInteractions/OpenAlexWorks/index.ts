import { Context, type Effect } from 'effect'
import type { OpenAlex } from '../../ExternalApis/index.ts'
import type { Doi } from '../../types/index.ts'

export { GetCategories as getCategories } from './GetCategories/index.ts'

export class GetCategories extends Context.Tag('GetCategories')<
  GetCategories,
  (
    doi: Doi.Doi,
  ) => Effect.Effect<
    ReadonlyArray<{ id: URL; display_name: string }>,
    OpenAlex.WorkIsNotFound | OpenAlex.WorkIsUnavailable
  >
>() {}
