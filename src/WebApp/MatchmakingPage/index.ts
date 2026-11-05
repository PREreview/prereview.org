import { Array, Struct, Effect, Option, pipe, Filter } from 'effect'
import { type MatchmakingInputWork, Embeddings } from '../../Embeddings/index.ts'
import { OpenAlexWorks } from '../../ExternalInteractions/OpenAlexWorks/index.ts'
import { createMatchmakingPage } from './MatchmakingPage.ts'
import { UrlParams } from 'effect/http'
import * as Doi from '../../types/Doi.ts'
import { PlainDate } from '../../types/Temporal.ts'
import { Preprints } from '../../Preprints/index.ts'
import { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'

export const MatchmakingPage = Effect.succeed(createMatchmakingPage(Option.none(), [])).pipe(
  Effect.withSpan('MatchmakingPage'),
)

export const MatchmakingSubmission = Effect.fn('MatchmakingSubmission')(
  function* (input: UrlParams.UrlParams) {
    const embeddings = yield* Embeddings
    const preprints = yield* Preprints
    const openAlexWorks = yield* OpenAlexWorks
    const user = yield* LoggedInUser

    const doi = pipe(input, UrlParams.getLast('doi'), Option.andThen(Doi.parse))

    if (Option.isNone(doi)) {
      return createMatchmakingPage(doi, [])
    }

    const frontmatter = yield* openAlexWorks.getFrontmatter(doi.value)

    const work = {
      doi: doi.value,
      title: frontmatter.title.value,
      abstract: Option.match(frontmatter.abstract, { onNone: () => '', onSome: abstract => abstract.value }),
      authors: Array.filterMap(frontmatter.authors, Filter.fromPredicateOption(Struct.get('orcidId'))),
    } satisfies MatchmakingInputWork

    const matches = yield* embeddings.getMatches([work], user.orcid, ['en'])

    const matchedWorks = yield* Effect.forEach(
      matches.picks,
      Effect.fnUntraced(function* (match) {
        const preprint = yield* preprints.getPreprint(match.preprintId)
        return { ...preprint, requested: PlainDate.from(match.latestRequest.toZonedDateTimeISO('UTC').toPlainDate()) }
      }),
    )

    return createMatchmakingPage(doi, matchedWorks)
  },
  Effect.catchTags({
    PreprintIsNotFound: () => HavingProblemsPage,
    PreprintIsUnavailable: () => HavingProblemsPage,
    UnableToGetMatches: () => HavingProblemsPage,
    WorkNotFound: () => HavingProblemsPage,
    WorkUnavailable: () => HavingProblemsPage,
  }),
)
