import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { type ResponseEnded, Status, type StatusOpen } from 'hyper-ts'
import type { OAuthEnv } from 'hyper-ts-oauth'
import * as RM from 'hyper-ts/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { P, match } from 'ts-pattern'
import { type CareerStage, maybeGetCareerStage } from '../career-stage'
import { type ContactEmailAddress, maybeGetContactEmailAddress } from '../contact-email-address'
import { deleteFlashMessage, getFlashMessage } from '../flash-message'
import { html, plainText, sendHtml } from '../html'
import { type IsOpenForRequests, maybeIsOpenForRequests } from '../is-open-for-requests'
import { type Languages, maybeGetLanguages } from '../languages'
import { type Location, maybeGetLocation } from '../location'
import { logInAndRedirect } from '../log-in'
import { serviceUnavailable } from '../middleware'
import { type FathomEnv, type PhaseEnv, page } from '../page'
import type { PublicUrlEnv } from '../public-url'
import { type ResearchInterests, maybeGetResearchInterests } from '../research-interests'
import {
  changeCareerStageMatch,
  changeCareerStageVisibilityMatch,
  changeContactEmailAddressMatch,
  changeLanguagesMatch,
  changeLanguagesVisibilityMatch,
  changeLocationMatch,
  changeLocationVisibilityMatch,
  changeOpenForRequestsMatch,
  changeOpenForRequestsVisibilityMatch,
  changeResearchInterestsMatch,
  changeResearchInterestsVisibilityMatch,
  connectSlackMatch,
  disconnectSlackMatch,
  myDetailsMatch,
  profileMatch,
} from '../routes'
import { type SlackUser, maybeGetSlackUser } from '../slack-user'
import { type GetUserEnv, type User, getUser } from '../user'
import { type UserOnboarding, getUserOnboarding, saveUserOnboarding } from '../user-onboarding'

export type Env = EnvFor<typeof myDetails>

const FlashMessageD = D.literal(
  'verify-contact-email',
  'contact-email-verified',
  'slack-connected',
  'slack-disconnected',
)

export const myDetails = pipe(
  getUser,
  RM.chainReaderTaskEitherKW(user =>
    pipe(
      RTE.Do,
      RTE.let('user', () => user),
      RTE.apSW('userOnboarding', getUserOnboarding(user.orcid)),
      RTE.apSW('slackUser', pipe(maybeGetSlackUser(user.orcid), RTE.map(O.fromNullable))),
      RTE.apSW('contactEmailAddress', pipe(maybeGetContactEmailAddress(user.orcid), RTE.map(O.fromNullable))),
      RTE.apSW('openForRequests', pipe(maybeIsOpenForRequests(user.orcid), RTE.map(O.fromNullable))),
      RTE.apSW('careerStage', pipe(maybeGetCareerStage(user.orcid), RTE.map(O.fromNullable))),
      RTE.apSW('researchInterests', pipe(maybeGetResearchInterests(user.orcid), RTE.map(O.fromNullable))),
      RTE.apSW('location', pipe(maybeGetLocation(user.orcid), RTE.map(O.fromNullable))),
      RTE.apSW('languages', pipe(maybeGetLanguages(user.orcid), RTE.map(O.fromNullable))),
    ),
  ),
  RM.apSW('message', RM.fromMiddleware(getFlashMessage(FlashMessageD))),
  RM.ichainFirstW(
    RM.fromReaderTaskEitherK(({ user, userOnboarding }) =>
      userOnboarding.seenMyDetailsPage
        ? RTE.of(undefined)
        : saveUserOnboarding(user.orcid, { seenMyDetailsPage: true }),
    ),
  ),
  RM.chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainFirstW(RM.fromMiddlewareK(() => deleteFlashMessage)),
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

function createPage({
  user,
  userOnboarding,
  message,
  slackUser,
  contactEmailAddress,
  openForRequests,
  careerStage,
  researchInterests,
  location,
  languages,
}: {
  user: User
  userOnboarding: UserOnboarding
  message?: D.TypeOf<typeof FlashMessageD>
  slackUser: O.Option<SlackUser>
  contactEmailAddress: O.Option<ContactEmailAddress>
  openForRequests: O.Option<IsOpenForRequests>
  careerStage: O.Option<CareerStage>
  researchInterests: O.Option<ResearchInterests>
  location: O.Option<Location>
  languages: O.Option<Languages>
}) {
  return page({
    title: plainText`My details`,
    content: html`
      <main id="main-content">
        ${match(message)
          .with(
            'verify-contact-email',
            () => html`
              <notification-banner aria-labelledby="notification-banner-title" type="notice" role="alert">
                <h2 id="notification-banner-title">Important</h2>

                <p>We’re sending you an email. Please open it and follow the link to verify your address.</p>
              </notification-banner>
            `,
          )
          .with(
            'contact-email-verified',
            () => html`
              <notification-banner aria-labelledby="notification-banner-title" role="alert">
                <h2 id="notification-banner-title">Success</h2>

                <p>Your email address has been verified.</p>
              </notification-banner>
            `,
          )
          .with(
            'slack-connected',
            () => html`
              <notification-banner aria-labelledby="notification-banner-title" role="alert">
                <h2 id="notification-banner-title">Success</h2>

                <p>Your Community Slack account has been connected.</p>
              </notification-banner>
            `,
          )
          .with(
            'slack-disconnected',
            () => html`
              <notification-banner aria-labelledby="notification-banner-title" role="alert">
                <h2 id="notification-banner-title">Success</h2>

                <p>Your Community Slack account has been disconnected.</p>
              </notification-banner>
            `,
          )
          .with(undefined, () => '')
          .exhaustive()}

        <h1>My details</h1>

        <div class="inset">
          ${match(userOnboarding)
            .with(
              { seenMyDetailsPage: false },
              () => html`
                <p>
                  Welcome to PREreview! You can use this page to help authors, editors, and other PREreviewers learn
                  more about your interests, work, and review activity.
                </p>
              `,
            )
            .with({ seenMyDetailsPage: true }, () => '')
            .exhaustive()}

          <p>Only you can see this page. You have two profile pages that everyone can see:</p>

          <div class="forward-group">
            <a
              href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: user.orcid } })}"
              class="forward"
              >View public profile</a
            >

            <a
              href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: user.pseudonym } })}"
              class="forward"
              >View pseudonym profile</a
            >
          </div>
        </div>

        <dl class="summary-list">
          <div>
            <dt>Name</dt>
            <dd>${user.name}</dd>
          </div>

          <div>
            <dt>ORCID iD</dt>
            <dd><span class="orcid">${user.orcid}</span></dd>
          </div>

          <div>
            <dt>PREreview pseudonym</dt>
            <dd>${user.pseudonym}</dd>
          </div>

          ${match(slackUser)
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
                    <a href="${format(disconnectSlackMatch.formatter, {})}"
                      >Disconnect <span class="visually-hidden">Slack account</span></a
                    >
                  </dd>
                </div>
              `,
            )
            .exhaustive()}
          ${match(contactEmailAddress)
            .when(
              O.isNone,
              () => html`
                <div>
                  <dt>Email address</dt>
                  <dd>
                    <a href="${format(changeContactEmailAddressMatch.formatter, {})}">Enter email address</a>
                  </dd>
                </div>
              `,
            )
            .with(
              { value: P.select() },
              contactEmailAddress => html`
                <div>
                  <dt>Email address</dt>
                  <dd>
                    ${contactEmailAddress.value}
                    ${match(contactEmailAddress.type)
                      .with('verified', () => '')
                      .with('unverified', () => html`<small>Unverified</small>`)
                      .exhaustive()}
                  </dd>
                  <dd>
                    <a href="${format(changeContactEmailAddressMatch.formatter, {})}"
                      >Change <span class="visually-hidden">email address</span></a
                    >
                  </dd>
                </div>
              `,
            )
            .exhaustive()}
          ${match(slackUser)
            .when(O.isNone, () => '')
            .when(
              O.isSome,
              () => html`
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
            .exhaustive()}

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
                    <small
                      >${match(careerStage.visibility)
                        .with('public', () => 'Shown on your public profile')
                        .with('restricted', () => 'Only visible to PREreview')
                        .exhaustive()}</small
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeCareerStageMatch.formatter, {})}"
                      >Change <span class="visually-hidden">career stage</span></a
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeCareerStageVisibilityMatch.formatter, {})}"
                      >Set <span class="visually-hidden">career-stage</span> visibility</a
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

          <div>
            <dt>Location</dt>
            ${match(location)
              .when(
                O.isNone,
                () => html`
                  <dd>
                    <a href="${format(changeLocationMatch.formatter, {})}">Enter location</a>
                  </dd>
                `,
              )
              .with(
                { value: P.select() },
                location => html`
                  <dd>
                    ${location.value}
                    <small
                      >${match(location.visibility)
                        .with('public', () => 'Shown on your public profile')
                        .with('restricted', () => 'Only visible to PREreview')
                        .exhaustive()}</small
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeLocationMatch.formatter, {})}"
                      >Change <span class="visually-hidden">location</span></a
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeLocationVisibilityMatch.formatter, {})}"
                      >Set <span class="visually-hidden">location</span> visibility</a
                    >
                  </dd>
                `,
              )
              .exhaustive()}
          </div>

          <div>
            <dt>Languages</dt>
            ${match(languages)
              .when(
                O.isNone,
                () => html`
                  <dd>
                    <a href="${format(changeLanguagesMatch.formatter, {})}">Enter languages</a>
                  </dd>
                `,
              )
              .with(
                { value: P.select() },
                languages => html`
                  <dd>
                    ${languages.value}
                    <small
                      >${match(languages.visibility)
                        .with('public', () => 'Shown on your public profile')
                        .with('restricted', () => 'Only visible to PREreview')
                        .exhaustive()}</small
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeLanguagesMatch.formatter, {})}"
                      >Change <span class="visually-hidden">languages</span></a
                    >
                  </dd>
                  <dd>
                    <a href="${format(changeLanguagesVisibilityMatch.formatter, {})}"
                      >Set <span class="visually-hidden">languages</span> visibility</a
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
    js: message ? ['notification-banner.js'] : [],
    current: 'my-details',
    user,
  })
}

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
