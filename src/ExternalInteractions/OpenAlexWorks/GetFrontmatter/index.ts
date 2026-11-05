import { Data, Effect, type Option, pipe } from 'effect'
import type { Doi } from '../../../types/Doi.ts'
import { OpenAlex } from '../../../ExternalApis/index.ts'
import type { Html } from '../../../html.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import type { Name } from '../../../types/Name.ts'
import { FrontmatterFromWork } from './FrontmatterFromWork.ts'

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

export const GetFrontmatter = (
  doi: Doi,
): Effect.Effect<Frontmatter, WorkNotFound | WorkUnavailable, OpenAlex.OpenAlex> =>
  pipe(
    OpenAlex.getWork(doi),
    Effect.timeout('2 seconds'),
    Effect.map(work => FrontmatterFromWork(doi, work)),
    Effect.catchTags({
      WorkIsNotFound: error => new WorkNotFound({ cause: error }),
      WorkIsUnavailable: error => new WorkUnavailable({ cause: error }),
      TimeoutError: error => new WorkUnavailable({ cause: error }),
    }),
    Effect.withSpan('OpenAlexWorks.getFrontmatter', { attributes: { doi } }),
  )
