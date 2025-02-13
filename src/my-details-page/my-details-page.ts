import { Option } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import type { CareerStage } from '../career-stage.js'
import type { ContactEmailAddress } from '../contact-email-address.js'
import { html, plainText } from '../html.js'
import type { IsOpenForRequests } from '../is-open-for-requests.js'
import type { Languages } from '../languages.js'
import type { Location } from '../location.js'
import type { OrcidToken } from '../orcid-token.js'
import type { ResearchInterests } from '../research-interests.js'
import { PageResponse } from '../response.js'
import {
  changeAvatarMatch,
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
  removeAvatarMatch,
} from '../routes.js'
import type { SlackUser } from '../slack-user.js'
import { ProfileId } from '../types/index.js'
import type { UserOnboarding } from '../user-onboarding.js'
import type { User } from '../user.js'

export function createPage({
  user,
  userOnboarding,
  orcidToken,
  avatar,
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
  orcidToken?: Option.Option<OrcidToken>
  avatar?: Option.Option<URL>
  slackUser: Option.Option<SlackUser>
  contactEmailAddress: Option.Option<ContactEmailAddress>
  openForRequests: Option.Option<IsOpenForRequests>
  careerStage: Option.Option<CareerStage>
  researchInterests: Option.Option<ResearchInterests>
  location: Option.Option<Location>
  languages: Option.Option<Languages>
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
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(user.orcid) })}" class="forward"
            ><span>View public profile</span></a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(user.pseudonym) })}"
            class="forward"
            ><span>View pseudonym profile</span></a
          >
        </div>
      </div>

      <dl class="summary-list">
        <div>
          <dt><span>Name</span></dt>
          <dd>${user.name}</dd>
        </div>

        <div>
          <dt><span>ORCID iD</span></dt>
          <dd><span class="orcid">${user.orcid}</span></dd>
        </div>

        <div>
          <dt><span>PREreview pseudonym</span></dt>
          <dd>${user.pseudonym}</dd>
        </div>

        ${match(orcidToken)
          .with(undefined, () => '')
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt><span>ORCID profile</span></dt>
                <dd>
                  <a href="${format(connectOrcidMatch.formatter, {})}">Connect ORCID profile</a>
                </dd>
              </div>
            `,
          )
          .when(
            Option.isSome,
            () => html`
              <div>
                <dt><span>ORCID profile</span></dt>
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
        ${match(avatar)
          .with(undefined, () => '')
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt><span>Avatar</span></dt>
                <dd>
                  <a href="${format(changeAvatarMatch.formatter, {})}">Upload avatar</a>
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            avatar => html`
              <div>
                <dt><span>Avatar</span></dt>
                <dd><img src="${avatar.href}" width="300" height="300" alt="" /></dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeAvatarMatch.formatter, {})}"
                        >Change <span class="visually-hidden">avatar</span></a
                      >
                    </li>
                    <li>
                      <a href="${format(removeAvatarMatch.formatter, {})}"
                        >Remove <span class="visually-hidden">avatar</span></a
                      >
                    </li>
                  </ul>
                </dd>
              </div>
            `,
          )
          .exhaustive()}
        ${match(slackUser)
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt><span>Slack Community name</span></dt>
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
                <dt><span>Slack Community name</span></dt>
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
            Option.isNone,
            () => html`
              <div>
                <dt><span>Email address</span></dt>
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
                <dt><span>Email address</span></dt>
                <dd>
                  ${contactEmailAddress.value}
                  ${match(contactEmailAddress._tag)
                    .with('VerifiedContactEmailAddress', () => '')
                    .with('UnverifiedContactEmailAddress', () => html`<small>Unverified</small>`)
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
          .when(Option.isNone, () => '')
          .when(
            Option.isSome,
            () => html`
              <div>
                <dt><span>Open for review requests</span></dt>
                ${match(openForRequests)
                  .when(
                    Option.isNone,
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
                        ${match(openForRequests)
                          .with(
                            { value: true },
                            () => html`
                              <ul>
                                <li>
                                  <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                    >Change <span class="visually-hidden">open for review requests</span></a
                                  >
                                </li>
                                <li>
                                  <a href="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}"
                                    >Set <span class="visually-hidden">open-for-review-requests</span> visibility</a
                                  >
                                </li>
                              </ul>
                            `,
                          )
                          .with(
                            { value: false },
                            () => html`
                              <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                >Change <span class="visually-hidden">open for review requests</span></a
                              >
                            `,
                          )
                          .exhaustive()}
                      </dd>
                    `,
                  )
                  .exhaustive()}
              </div>
            `,
          )
          .exhaustive()}

        <div>
          <dt><span>Career stage</span></dt>
          ${match(careerStage)
            .when(
              Option.isNone,
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
                  <ul>
                    <li>
                      <a href="${format(changeCareerStageMatch.formatter, {})}"
                        >Change <span class="visually-hidden">career stage</span></a
                      >
                    </li>
                    <li>
                      <a href="${format(changeCareerStageVisibilityMatch.formatter, {})}"
                        >Set <span class="visually-hidden">career-stage</span> visibility</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt><span>Research interests</span></dt>
          ${match(researchInterests)
            .when(
              Option.isNone,
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
                  <ul>
                    <li>
                      <a href="${format(changeResearchInterestsMatch.formatter, {})}"
                        >Change <span class="visually-hidden">research interests</span></a
                      >
                    </li>
                    <li>
                      <a href="${format(changeResearchInterestsVisibilityMatch.formatter, {})}"
                        >Set <span class="visually-hidden">research-interests</span> visibility</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt><span>Location</span></dt>
          ${match(location)
            .when(
              Option.isNone,
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
                  <ul>
                    <li>
                      <a href="${format(changeLocationMatch.formatter, {})}"
                        >Change <span class="visually-hidden">location</span></a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLocationVisibilityMatch.formatter, {})}"
                        >Set <span class="visually-hidden">location</span> visibility</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt><span>Languages</span></dt>
          ${match(languages)
            .when(
              Option.isNone,
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
                  <ul>
                    <li>
                      <a href="${format(changeLanguagesMatch.formatter, {})}"
                        >Change <span class="visually-hidden">languages</span></a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLanguagesVisibilityMatch.formatter, {})}"
                        >Set <span class="visually-hidden">languages</span> visibility</a
                      >
                    </li>
                  </ul>
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
