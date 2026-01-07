import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import { type CareerStage, getCareerStage, saveCareerStage } from '../../career-stage.ts'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { LogInResponse, type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { createFormPage } from './change-career-stage-visibility-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeCareerStageVisibility>>

export const changeCareerStageVisibility = ({
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
    RTE.bindW('careerStage', ({ user }) => getCareerStage(user.orcid)),
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
          .with({ method: 'POST' }, handleChangeCareerStageVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeCareerStageVisibilityFormD = pipe(D.struct({ careerStageVisibility: D.literal('public', 'restricted') }))

const handleChangeCareerStageVisibilityForm = ({
  body,
  careerStage,
  locale,
  user,
}: {
  body: unknown
  careerStage: CareerStage
  locale: SupportedLocale
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeCareerStageVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ careerStageVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ careerStageVisibility }) => ({ ...careerStage, visibility: careerStageVisibility }),
        careerStage => saveCareerStage(user.orcid, careerStage),
        RTE.matchW(
          () => havingProblemsPage(locale),
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )
