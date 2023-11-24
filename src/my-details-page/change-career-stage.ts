import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { type CareerStage, deleteCareerStage, getCareerStage, saveCareerStage } from '../career-stage'
import { html, plainText, rawHtml } from '../html'
import { havingProblemsPage } from '../http-error'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeCareerStageMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

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

function createFormPage({ careerStage, error = false }: { careerStage: O.Option<CareerStage>; error?: boolean }) {
  return PageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}What career stage are you at?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeCareerStageMatch.formatter, {})}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  <li>
                    <a href="#career-stage-early"> Select which career stage you are at </a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <div ${error ? rawHtml('class="error"') : ''}>
          <fieldset role="group" ${error ? rawHtml('aria-invalid="true" aria-errormessage="career-stage-error"') : ''}>
            <legend>
              <h1>What career stage are you at?</h1>
            </legend>

            ${error
              ? html`
                  <div class="error-message" id="career-stage-error">
                    <span class="visually-hidden">Error:</span>
                    Select which career stage you are at
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="early"
                    id="career-stage-early"
                    ${match(careerStage)
                      .with({ value: { value: 'early' } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Early</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="mid"
                    ${match(careerStage)
                      .with({ value: { value: 'mid' } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Mid</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="careerStage"
                    type="radio"
                    value="late"
                    ${match(careerStage)
                      .with({ value: { value: 'late' } }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>Late</span>
                </label>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input name="careerStage" type="radio" value="skip" />
                  <span>Prefer not to say</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeCareerStageMatch.formatter, {}),
    js: error ? ['error-summary.js'] : [],
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
