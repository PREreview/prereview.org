import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { deleteCareerStage, getCareerStage, saveCareerStage } from '../career-stage.js'
import { havingProblemsPage } from '../http-error.js'
import { LogInResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import type { User } from '../user.js'
import { createFormPage } from './change-career-stage-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeCareerStage>>

export const changeCareerStage = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.matchEW(
      error =>
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state => match(state).with({ method: 'POST' }, handleChangeCareerStageForm).otherwise(showChangeCareerStageForm),
    ),
  )

const showChangeCareerStageForm = flow(
  ({ user }: { user: User }) => getCareerStage(user.orcid),
  RTE.match(() => O.none, O.some),
  RT.map(careerStage => createFormPage({ careerStage })),
)

const ChangeCareerStageFormD = pipe(D.struct({ careerStage: D.literal('early', 'mid', 'late', 'skip') }))

const handleChangeCareerStageForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(ChangeCareerStageFormD.decode(body)),
    RTE.matchE(
      () => RT.of(createFormPage({ careerStage: O.none, error: true })),
      ({ careerStage }) =>
        match(careerStage)
          .with(P.union('early', 'mid', 'late'), careerStage =>
            pipe(
              RTE.Do,
              RTE.let('value', () => careerStage),
              RTE.apS(
                'visibility',
                pipe(
                  getCareerStage(user.orcid),
                  RTE.map(get('visibility')),
                  RTE.orElseW(error =>
                    match(error)
                      .with('not-found', () => RTE.of('restricted' as const))
                      .otherwise(RTE.left),
                  ),
                ),
              ),
              RTE.chain(careerStage => saveCareerStage(user.orcid, careerStage)),
              RTE.matchW(
                () => havingProblemsPage,
                () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
              ),
            ),
          )
          .with('skip', () =>
            pipe(
              deleteCareerStage(user.orcid),
              RTE.matchW(
                () => havingProblemsPage,
                () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
              ),
            ),
          )
          .exhaustive(),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
