import { Array, Struct, Effect, Option, pipe } from 'effect'
import { createMatchmakingPage } from './MatchmakingPage.ts'
import { UrlParams } from '@effect/platform'
import * as Doi from '../../types/Doi.ts'
import { PlainDate } from '../../types/Temporal.ts'
import { Preprints } from '../../Preprints/index.ts'
import { Embeddings } from '../../Embeddings/index.ts'
import { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'

export const MatchmakingPage = Effect.succeed(createMatchmakingPage(Option.none(), []))

export const MatchmakingSubmission = Effect.fn(
  function* (input: UrlParams.UrlParams) {
    const embeddings = yield* Embeddings
    const preprints = yield* Preprints
    const user = yield* LoggedInUser

    const doi = pipe(input, UrlParams.getLast('doi'), Option.andThen(Doi.parse))

    if (Option.isNone(doi)) {
      return createMatchmakingPage(doi, [])
    }

    const work = {
      doi: doi.value,
      title: 'Title',
      abstract: 'Abstract',
      authors: [],
    }

    const matches = yield* embeddings.getMatches([work], user.orcid, ['en'])

    const preprintIds = Array.map(matches.picks, Struct.get('preprintId'))

    const matchedWorks = yield* Effect.forEach(
      preprintIds,
      Effect.fnUntraced(function* (preprintId) {
        const preprint = yield* preprints.getPreprint(preprintId)
        return { ...preprint, requested: PlainDate.from('2024-06-06') }
      }),
    )

    return createMatchmakingPage(doi, matchedWorks)
  },
  Effect.catchTags({
    PreprintIsNotFound: () => HavingProblemsPage,
    PreprintIsUnavailable: () => HavingProblemsPage,
    UnableToGetSurveyPapers: () => HavingProblemsPage,
  }),
)
