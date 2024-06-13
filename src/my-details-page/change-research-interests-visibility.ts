import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { havingProblemsPage } from '../http-error.js'
import { type ResearchInterests, getResearchInterests, saveResearchInterests } from '../research-interests.js'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { createFormPage } from './change-research-interests-visibility-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeResearchInterestsVisibility>>

export const changeResearchInterestsVisibility = ({
  body,
  method,
  user,
}: {
  body: unknown
  method: string
  user?: User
}) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('researchInterests', ({ user }) => getResearchInterests(user.orcid)),
    RTE.matchE(
      error =>
        match(error)
          .returnType<RT.ReaderTask<unknown, RedirectResponse | LogInResponse | PageResponse>>()
          .with('not-found', () => RT.of(RedirectResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .with('unavailable', () => RT.of(havingProblemsPage))
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
  researchInterests,
  user,
}: {
  body: unknown
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
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
