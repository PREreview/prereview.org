import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { html, plainText } from '../html'
import { havingProblemsPage } from '../http-error'
import { type Languages, getLanguages, saveLanguages } from '../languages'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeLanguagesVisibilityMatch, myDetailsMatch } from '../routes'
import type { User } from '../user'

export type Env = EnvFor<ReturnType<typeof changeLanguagesVisibility>>

export const changeLanguagesVisibility = ({ body, method, user }: { body: unknown; method: string; user?: User }) =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('body', () => body),
    RTE.let('method', () => method),
    RTE.bindW('languages', ({ user }) => getLanguages(user.orcid)),
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
          .with({ method: 'POST' }, handleChangeLanguagesVisibilityForm)
          .otherwise(state => RT.of(createFormPage(state))),
    ),
  )

const ChangeLanguagesVisibilityFormD = pipe(D.struct({ languagesVisibility: D.literal('public', 'restricted') }))

const handleChangeLanguagesVisibilityForm = ({
  body,
  languages,
  user,
}: {
  body: unknown
  languages: Languages
  user: User
}) =>
  pipe(
    RTE.fromEither(ChangeLanguagesVisibilityFormD.decode(body)),
    RTE.getOrElseW(() => RT.of({ languagesVisibility: 'restricted' as const })),
    RT.chain(
      flow(
        ({ languagesVisibility }) => ({ ...languages, visibility: languagesVisibility }),
        languages => saveLanguages(user.orcid, languages),
        RTE.matchW(
          () => havingProblemsPage,
          () => RedirectResponse({ location: format(myDetailsMatch.formatter, {}) }),
        ),
      ),
    ),
  )

function createFormPage({ languages }: { languages: Languages }) {
  return PageResponse({
    title: plainText`Who can see your languages?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeLanguagesVisibilityMatch.formatter, {})}" novalidate>
        <fieldset role="group">
          <legend>
            <h1>Who can see your languages?</h1>
          </legend>

          <ol>
            <li>
              <label>
                <input
                  name="languagesVisibility"
                  id="languages-visibility-public"
                  type="radio"
                  value="public"
                  aria-describedby="languages-visibility-tip-public"
                  ${match(languages.visibility)
                    .with('public', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Everyone</span>
              </label>
              <p id="languages-visibility-tip-public" role="note">We’ll show them on your public profile.</p>
            </li>
            <li>
              <label>
                <input
                  name="languagesVisibility"
                  id="languages-visibility-restricted"
                  type="radio"
                  value="restricted"
                  aria-describedby="languages-visibility-tip-restricted"
                  ${match(languages.visibility)
                    .with('restricted', () => 'checked')
                    .otherwise(() => '')}
                />
                <span>Only PREreview</span>
              </label>
              <p id="languages-visibility-tip-restricted" role="note">We won’t share them with anyone else.</p>
            </li>
          </ol>
        </fieldset>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeLanguagesVisibilityMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
