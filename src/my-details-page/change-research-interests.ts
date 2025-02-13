import { flow, Option, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { havingProblemsPage } from '../http-error.js'
import { deleteResearchInterests, getResearchInterests, saveResearchInterests } from '../research-interests.js'
import { LogInResponse, RedirectResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import { NonEmptyStringC } from '../types/string.js'
import type { User } from '../user.js'
import { createFormPage } from './change-research-interests-form-page.js'

export type Env = EnvFor<ReturnType<typeof changeResearchInterests>>

export const changeResearchInterests = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
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
      state =>
        match(state)
          .with({ method: 'POST' }, handleChangeResearchInterestsForm)
          .otherwise(showChangeResearchInterestsForm),
    ),
  )

const showChangeResearchInterestsForm = flow(
  ({ user }: { user: User }) => getResearchInterests(user.orcid),
  RTE.match(Option.none, Option.some),
  RT.map(createFormPage),
)

const ChangeResearchInterestsFormD = pipe(D.struct({ researchInterests: NonEmptyStringC }))

const handleChangeResearchInterestsForm = ({ body, user }: { body: unknown; user: User }) =>
  pipe(
    RTE.fromEither(ChangeResearchInterestsFormD.decode(body)),
    RTE.matchE(
      () =>
        pipe(
          deleteResearchInterests(user.orcid),
          RTE.matchW(
            () => havingProblemsPage,
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
      ({ researchInterests }) =>
        pipe(
          RTE.Do,
          RTE.let('value', () => researchInterests),
          RTE.apS(
            'visibility',
            pipe(
              getResearchInterests(user.orcid),
              RTE.map(Struct.get('visibility')),
              RTE.orElseW(error =>
                match(error)
                  .with('not-found', () => RTE.of('restricted' as const))
                  .otherwise(RTE.left),
              ),
            ),
          ),
          RTE.chain(researchInterests => saveResearchInterests(user.orcid, researchInterests)),
          RTE.matchW(
            () => havingProblemsPage,
            () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
          ),
        ),
    ),
  )
