import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import { P, match } from 'ts-pattern'
import type { CareerStage } from '../career-stage'
import type { ContactEmailAddress } from '../contact-email-address'
import { html, plainText } from '../html'
import type { IsOpenForRequests } from '../is-open-for-requests'
import type { Languages } from '../languages'
import type { Location } from '../location'
import type { OrcidToken } from '../orcid-token'
import type { ResearchInterests } from '../research-interests'
import { PageResponse } from '../response'
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
  connectOrcidMatch,
  connectSlackMatch,
  disconnectOrcidMatch,
  disconnectSlackMatch,
  myDetailsMatch,
  profileMatch,
} from '../routes'
import type { SlackUser } from '../slack-user'
import type { User } from '../user'
import type { UserOnboarding } from '../user-onboarding'

export function createPage({
  user,
  userOnboarding,
  orcidToken,
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
  orcidToken?: O.Option<OrcidToken>
  slackUser: O.Option<SlackUser>
  contactEmailAddress: O.Option<ContactEmailAddress>
  openForRequests: O.Option<IsOpenForRequests>
  careerStage: O.Option<CareerStage>
  researchInterests: O.Option<ResearchInterests>
  location: O.Option<Location>
  languages: O.Option<Languages>
}) {
  return PageResponse({
    title: plainText`My details`,
    main: html`
      <h1>My details</h1>

      <div class="inset">
        ${match(userOnboarding)
          .with(
            { seenMyDetailsPage: false },
            () => html`
              <p>
                Welcome to PREreview! You can use this page to help authors, editors, and other PREreviewers learn more
                about your interests, work, and review activity.
              </p>
            `,
          )
          .with({ seenMyDetailsPage: true }, () => '')
          .exhaustive()}

        <p>Only you can see this page. You have two profile pages that everyone can see:</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: user.orcid } })}" class="forward"
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

        ${match(orcidToken)
          .with(undefined, () => '')
          .when(
            O.isNone,
            () => html`
              <div>
                <dt>ORCID profile</dt>
                <dd>
                  <a href="${format(connectOrcidMatch.formatter, {})}">Connect ORCID profile</a>
                </dd>
              </div>
            `,
          )
          .when(
            O.isSome,
            () => html`
              <div>
                <dt>ORCID profile</dt>
                <dd>Connected</dd>
                <dd>
                  <a href="${format(disconnectOrcidMatch.formatter, {})}"
                    >Disconnect <span class="visually-hidden">ORCID profile</span></a
                  >
                </dd>
              </div>
            `,
          )
          .exhaustive()}
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
                        <a href="${format(changeOpenForRequestsMatch.formatter, {})}">Enter open for review requests</a>
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
    `,
    current: 'my-details',
    canonical: format(myDetailsMatch.formatter, {}),
  })
}
