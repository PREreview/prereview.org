import { Data, type Effect, type Option } from 'effect'
import type { Doi } from '../../../types/Doi.ts'
import type { OpenAlex } from '../../../ExternalApis/index.ts'
import type { Html } from '../../../html.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import type { Name } from '../../../types/Name.ts'

interface Author {
  displayName: Name
  orcidId: Option.Option<OrcidId>
}

export interface Frontmatter {
  doi: Doi
  title: Html
  abstract: Option.Option<Html>
  authors: ReadonlyArray<Author>
}

export class WorkNotFound extends Data.TaggedError('WorkNotFound')<{ cause?: unknown }> {}

export class WorkUnavailable extends Data.TaggedError('WorkUnavailable')<{ cause?: unknown }> {}

export declare const GetFrontmatter: (
  doi: Doi,
) => Effect.Effect<Frontmatter, WorkNotFound | WorkUnavailable, OpenAlex.OpenAlex>
