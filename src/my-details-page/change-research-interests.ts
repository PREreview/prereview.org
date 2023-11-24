import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { html, plainText, rawHtml } from '../html'
import { havingProblemsPage } from '../http-error'
import {
  type ResearchInterests,
  deleteResearchInterests,
  getResearchInterests,
  saveResearchInterests,
} from '../research-interests'
import { LogInResponse, PageResponse, RedirectResponse } from '../response'
import { changeResearchInterestsMatch, myDetailsMatch } from '../routes'
import { NonEmptyStringC } from '../types/string'
import type { User } from '../user'

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
  RTE.match(() => O.none, O.some),
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
              RTE.map(get('visibility')),
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

function createFormPage(researchInterests: O.Option<ResearchInterests>) {
  return PageResponse({
    title: plainText`What are your research interests?`,
    nav: html`<a href="${format(myDetailsMatch.formatter, {})}" class="back">Back</a>`,
    main: html`
      <form method="post" action="${format(changeResearchInterestsMatch.formatter, {})}" novalidate>
        <h1><label for="research-interests">What are your research interests?</label></h1>

        <textarea name="researchInterests" id="research-interests" rows="5">
${match(researchInterests)
            .with({ value: { value: P.select() } }, rawHtml)
            .when(O.isNone, () => '')
            .exhaustive()}</textarea
        >

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(changeResearchInterestsMatch.formatter, {}),
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
