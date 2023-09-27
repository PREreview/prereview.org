import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { flow, pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { P, match } from 'ts-pattern'
import { type CareerStage, getCareerStage } from './career-stage'
import { canConnectSlack } from './feature-flags'
import { html, plainText, sendHtml } from './html'
import { type IsOpenForRequests, isOpenForRequests } from './is-open-for-requests'
import { logInAndRedirect } from './log-in'
import { serviceUnavailable } from './middleware'
import { type FathomEnv, type PhaseEnv, page } from './page'
import type { PublicUrlEnv } from './public-url'
import { type ResearchInterests, getResearchInterests } from './research-interests'
import {
  changeCareerStageMatch,
  changeOpenForRequestsMatch,
  changeOpenForRequestsVisibilityMatch,
  changeResearchInterestsMatch,
  changeResearchInterestsVisibilityMatch,
  connectSlackMatch,
  myDetailsMatch,
  profileMatch,
} from './routes'
import { type SlackUser, getSlackUser } from './slack-user'
import { type GetUserEnv, type User, getUser } from './user'

export const myDetails = pipe(
  getUser,
  RM.bindTo('user'),
  RM.bindW(
    'canConnectSlack',
    RM.fromReaderK(({ user }) => canConnectSlack(user)),
  ),
  RM.bindW(
    'slackUser',
    flow(
      RM.fromReaderTaskEitherK(({ user: { orcid } }) => getSlackUser(orcid)),
      RM.map(O.some),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => RM.of(O.none))
          .with('unavailable', RM.left)
          .exhaustive(),
      ),
    ),
  ),
  RM.bindW(
    'openForRequests',
    flow(
      RM.fromReaderTaskEitherK(({ user: { orcid } }) => isOpenForRequests(orcid)),
      RM.map(O.some),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => RM.of(O.none))
          .with('unavailable', RM.left)
          .exhaustive(),
      ),
    ),
  ),
  RM.bindW(
    'careerStage',
    flow(
      RM.fromReaderTaskEitherK(({ user: { orcid } }) => getCareerStage(orcid)),
      RM.map(O.some),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => RM.of(O.none))
          .otherwise(RM.left),
      ),
    ),
  ),
  RM.bindW(
    'researchInterests',
    flow(
      RM.fromReaderTaskEitherK(({ user: { orcid } }) => getResearchInterests(orcid)),
      RM.map(O.some),
      RM.orElseW(error =>
        match(error)
          .with('not-found', () => RM.of(O.none))
          .otherwise(RM.left),
      ),
    ),
  ),
  RM.chainReaderKW(({ user, canConnectSlack, slackUser, openForRequests, careerStage, researchInterests }) =>
    createPage(user, canConnectSlack, slackUser, openForRequests, careerStage, researchInterests),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .returnType<
        RM.ReaderMiddleware<
          GetUserEnv & FathomEnv & PhaseEnv & PublicUrlEnv & OAuthEnv,
          StatusOpen,
          ResponseEnded,
          never,
          void
        >
      >()
      .with('no-session', () => logInAndRedirect(myDetailsMatch.formatter, {}))
      .with('unavailable', () => serviceUnavailable)
      .with(P.instanceOf(Error), () => serviceUnavailable)
      .exhaustive(),
  ),
)

function createPage(
  user: User,
  canConnectSlack: boolean,
  slackUser: O.Option<SlackUser>,
  openForRequests: O.Option<IsOpenForRequests>,
  careerStage: O.Option<CareerStage>,
  researchInterests: O.Option<ResearchInterests>,
) {
  return page({
    title: plainText`My details`,
    content: html`
      <main id="main-content">
        <h1>My details</h1>

        <dl class="summary-list">
          <div>
            <dt>Name</dt>
            <dd>${user.name}</dd>
          </div>

          <div>
            <dt>ORCID iD</dt>
            <dd><a href="https://orcid.org/${user.orcid}" class="orcid">${user.orcid}</a></dd>
            <dd>
              <a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: user.orcid } })}"
                >View <span class="visually-hidden">public profile</span></a
              >
            </dd>
          </div>

          <div>
            <dt>PREreview pseudonym</dt>
            <dd>${user.pseudonym}</dd>
            <dd>
              <a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: user.pseudonym } })}"
                >View <span class="visually-hidden">pseudonym profile</span></a
              >
            </dd>
          </div>

          ${canConnectSlack
            ? match(slackUser)
                .when(
                  O.isNone,
                  () => html`
                    <div>
                      <dt>Slack Community name</dt>
                      <dd>
                        <a href="${format(connectSlackMatch.formatter, {})}">Connect Slack account</a>
                      </dd>
                    </div>
                  `,
                )
                .with(
                  { value: P.select() },
                  slackUser => html`
                    <div>
                      <dt>Slack Community name</dt>
                      <dd>
                        <span class="slack">
                          <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                          <span>${slackUser.name}</span>
                        </span>
                      </dd>
                      <dd>
                        <a href="${slackUser.profile.href}"
                          >View <span class="visually-hidden">Slack Community profile</span></a
                        >
                      </dd>
                    </div>

                    <div>
                      <dt>Open for review requests</dt>
                      ${match(openForRequests)
                        .when(
                          O.isNone,
                          () => html`
                            <dd>
                              <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                >Enter open for review requests</a
                              >
                            </dd>
                          `,
                        )
                        .with(
                          { value: P.select() },
                          openForRequests => html`
                            <dd>
                              ${match(openForRequests)
                                .with(
                                  { value: true },
                                  openForRequests =>
                                    html`Yes
                                      <small
                                        >${match(openForRequests.visibility)
                                          .with('public', () => 'Shown on your public profile')
                                          .with('restricted', () => 'Only visible to PREreview')
                                          .exhaustive()}</small
                                      > `,
                                )
                                .with({ value: false }, () => 'No')
                                .exhaustive()}
                            </dd>
                            <dd>
                              <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                >Change <span class="visually-hidden">open for review requests</span></a
                              >
                            </dd>
                            ${match(openForRequests)
                              .with(
                                { value: true },
                                () => html`
                                  <dd>
                                    <a href="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}"
                                      >Set <span class="visually-hidden">open-for-review-requests</span> visibility</a
                                    >
                                  </dd>
                                `,
                              )
                              .with({ value: false }, () => '')
                              .exhaustive()}
                          `,
                        )
                        .exhaustive()}
                    </div>
                  `,
                )
                .exhaustive()
            : ''}

          <div>
            <dt>Career stage</dt>
            ${match(careerStage)
              .when(
                O.isNone,
                () => html`
                  <dd>
                    <a href="${format(changeCareerStageMatch.formatter, {})}">Enter career stage</a>
                  </dd>
                `,
              )
              .with(
                { value: P.select() },
                careerStage => html`
                  <dd>
                    ${match(careerStage.value)
                      .with('early', () => 'Early')
                      .with('mid', () => 'Mid')
                      .with('late', () => 'Late')
                      .exhaustive()}
                  </dd>
                  <dd>
                    <a href="${format(changeCareerStageMatch.formatter, {})}"
                      >Change <span class="visually-hidden">career stage</span></a
                    >
                  </dd>
                `,
              )
              .exhaustive()}
          </div>

          <div>
            <dt>Research interests</dt>
            ${match(researchInterests)
              .when(
                O.isNone,
                () => html`
                  <dd>
                    <a href="${format(changeResearchInterestsMatch.formatter, {})}">Enter research interests</a>
                  </dd>
                `,
              )
              .with(
                { value: P.select() },
                researchInterests => html`
                  <dd>
                    ${researchInterests.value}
                    <small
                      >${match(researchInterests.visibility)
                        .with('public', () => 'Shown on your public profile')
                        .with('restricted', () => 'Only visible to PREreview')
                        .exhaustive()}</small
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeResearchInterestsMatch.formatter, {})}"
                      >Change <span class="visually-hidden">research interests</span></a
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeResearchInterestsVisibilityMatch.formatter, {})}"
                      >Set <span class="visually-hidden">research-interests</span> visibility</a
                    >
                  </dd>
                `,
              )
              .exhaustive()}
          </div>
        </dl>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    current: 'my-details',
    user,
  })
}
