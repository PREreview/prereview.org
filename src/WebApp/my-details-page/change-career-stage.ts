import { Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match, P } from 'ts-pattern'
import { deleteCareerStage, getCareerStage, saveCareerStage } from '../../career-stage.ts'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { LogInResponse, RedirectResponse } from '../../Response/index.ts'
import { myDetailsMatch } from '../../routes.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { createFormPage } from './change-career-stage-form-page.ts'

export type Env = EnvFor<ReturnType<typeof changeCareerStage>>

export const changeCareerStage = ({
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
    RTE.matchEW(
      error =>
        match(error)
          .with('no-session', () => RT.of(LogInResponse({ location: format(myDetailsMatch.formatter, {}) })))
          .exhaustive(),
      state => match(state).with({ method: 'POST' }, handleChangeCareerStageForm).otherwise(showChangeCareerStageForm),
    ),
  )

const showChangeCareerStageForm = ({ locale, user }: { locale: SupportedLocale; user: User }) =>
  pipe(
    getCareerStage(user.orcid),
    RTE.match(Option.none, Option.some),
    RT.map(careerStage => createFormPage({ careerStage, locale })),
  )

const ChangeCareerStageFormD = pipe(D.struct({ careerStage: D.literal('early', 'mid', 'late', 'skip') }))

const handleChangeCareerStageForm = ({ body, locale, user }: { body: unknown; locale: SupportedLocale; user: User }) =>
  pipe(
    RTE.fromEither(ChangeCareerStageFormD.decode(body)),
    RTE.matchE(
      () => RT.of(createFormPage({ careerStage: Option.none(), error: true, locale })),
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
                  RTE.map(Struct.get('visibility')),
                  RTE.orElseW(error =>
                    match(error)
                      .with('not-found', () => RTE.of('restricted' as const))
                      .otherwise(RTE.left),
                  ),
                ),
              ),
              RTE.chain(careerStage => saveCareerStage(user.orcid, careerStage)),
              RTE.matchW(
                () => havingProblemsPage(locale),
                () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
              ),
            ),
          )
          .with('skip', () =>
            pipe(
              deleteCareerStage(user.orcid),
              RTE.matchW(
                () => havingProblemsPage(locale),
                () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
              ),
            ),
          )
          .exhaustive(),
    ),
  )
