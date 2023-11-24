import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { type CareerStage, getCareerStage, saveCareerStage } from '../career-stage'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeCareerStageVisibilityMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

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

function createFormPage({ careerStage }: { careerStage: CareerStage }) {
  return PageResponse({
    title: plainText`Who can see your career stage?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeCareerStageVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your career stage?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="careerStageVisibility"
                  id="career-stage-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="career-stage-visibility-tip-public"
                  ${match(careerStage.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="career-stage-visibility-tip-public" role="note">We’ll show it on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="careerStageVisibility"
                  id="career-stage-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="career-stage-visibility-tip-restricted"
                  ${match(careerStage.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="career-stage-visibility-tip-restricted" role="note">We won’t share it with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeCareerStageVisibilityMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
