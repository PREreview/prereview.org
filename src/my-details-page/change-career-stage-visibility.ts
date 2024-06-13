import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { type CareerStage, getCareerStage, saveCareerStage } from '../career-stage.js'
import { havingProblemsPage } from '../http-error.js'
import { LogInResponse, type PageResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { createFormPage } from './change-career-stage-visibility-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeCareerStageVisibility>>

export const changeCareerStageVisibility = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('careerStage', ({ user }) => getCareerStage(user.orcid)),
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
          .with({ method: 'POST' }, handleChangeCareerStageVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeCareerStageVisibilityFormD = pipe(D.struct({ careerStageVisibility: D.literal('public', 'restricted') }))

const handleChangeCareerStageVisibilityForm = ({
  body,
  careerStage,
  user,
}: {
  body: unknown
  careerStage: CareerStage
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
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
