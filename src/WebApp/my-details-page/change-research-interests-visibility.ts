import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { type ResearchInterests, getResearchInterests, saveResearchInterests } from '../../research-interests.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { createFormPage } from './change-research-interests-visibility-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeResearchInterestsVisibility>>

export const changeResearchInterestsVisibility = ({
  body,
  locale,
  method,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.let('locale', () => locale),
    RTE.bindW('researchInterests', ({ user }) => getResearchInterests(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage(locale)))
          .exhaustive(),
      state =>
        match(state)
          .with({ method: 'POST' }, handleChangeResearchInterestsVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeResearchInterestsVisibilityFormD = pipe(
  D.struct({ researchInterestsVisibility: D.literal('public', 'restricted') }),
)

const handleChangeResearchInterestsVisibilityForm = ({
  body,
  locale,
  researchInterests,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  researchInterests: ResearchInterests
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeResearchInterestsVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ researchInterestsVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ researchInterestsVisibility }) => ({ ...researchInterests, visibility: researchInterestsVisibility }),
        researchInterests => saveResearchInterests(user.orcid, researchInterests),
        RTE.matchW(
          () => havingProblemsPage(locale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
