import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { match, P } from 'ts-pattern'
import type { CareerStage } from '../../career-stage.ts'
import type { ContactEmailAddress } from '../../ContactEmailAddresses/index.ts'
import { html, plainText, type Html } from '../../html.ts'
import type { IsOpenForRequests } from '../../is-open-for-requests.ts'
import type { Languages } from '../../languages.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { Location } from '../../location.ts'
import type { OrcidToken } from '../../orcid-token.ts'
import type * as Prereviewers from '../../Prereviewers/index.ts'
import type { ResearchInterests } from '../../research-interests.ts'
import * as Routes from '../../routes.ts'
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
} from '../../routes.ts'
import type { SlackUser } from '../../slack-user.ts'
import { ProfileId } from '../../types/index.ts'
import type { UserOnboarding } from '../../user-onboarding.ts'
import { PageResponse } from '../Response/index.ts'

export function createPage({
  publicPersona,
  pseudonymPersona,
  locale,
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
  requestedReviewNotifications,
}: {
  publicPersona: Prereviewers.PublicPersona
  pseudonymPersona: Prereviewers.PseudonymPersona
  locale: SupportedLocale
  userOnboarding: UserOnboarding
  orcidToken: Option.Option<OrcidToken>
  avatar: Option.Option<URL>
  slackUser: Option.Option<SlackUser>
  contactEmailAddress: Option.Option<ContactEmailAddress>
  openForRequests: Option.Option<IsOpenForRequests>
  careerStage: Option.Option<CareerStage>
  researchInterests: Option.Option<ResearchInterests>
  location: Option.Option<Location>
  languages: Option.Option<Languages>
  requestedReviewNotifications: boolean
}) {
  const t = translate(locale, 'my-details')

  return PageResponse({
    title: plainText(t('myDetails')()),
    main: html`
      <h1>${t('myDetails')()}</h1>

      <div class="inset">
        ${match(userOnboarding)
          .with({ seenMyDetailsPage: false }, () => html`<p>${t('welcomeToPrereview')()}</p>`)
          .with({ seenMyDetailsPage: true }, () => '')
          .exhaustive()}

        <p>${t('onlyYouCanSee')()}</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(publicPersona) })}" class="forward"
            >${t('viewPublicProfile')()}</a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(pseudonymPersona) })}"
            class="forward"
            >${t('viewPseudonymProfile')()}</a
          >
        </div>
      </div>

      <dl class="summary-list">
        <div>
          <dt>${t('name')()}</dt>
          <dd>${publicPersona.name}</dd>
        </div>

        <div>
          <dt translate="no">ORCID iD</dt>
          <dd><span class="orcid-id">${publicPersona.orcidId}</span></dd>
        </div>

        <div>
          <dt>${t('pseudonym')()}</dt>
          <dd>${pseudonymPersona.pseudonym}</dd>
        </div>

        ${match(orcidToken)
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt>${t('orcidRecord')()}</dt>
                <dd>
                  <a href="${format(connectOrcidMatch.formatter, {})}">${t('connectOrcidRecord')()}</a>
                </dd>
              </div>
            `,
          )
          .when(
            Option.isSome,
            () => html`
              <div>
                <dt>${t('orcidRecord')()}</dt>
                <dd>${t('connected')()}</dd>
                <dd>
                  <a href="${format(disconnectOrcidMatch.formatter, {})}"
                    >${t('disconnectOrcidRecord')(visuallyHidden)}</a
                  >
                </dd>
              </div>
            `,
          )
          .exhaustive()}
        ${match(avatar)
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt>${t('avatar')()}</dt>
                <dd>
                  <a href="${format(changeAvatarMatch.formatter, {})}">${t('uploadAvatar')()}</a>
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            avatar => html`
              <div>
                <dt>${t('avatar')()}</dt>
                <dd><img src="${avatar.href}" width="300" height="300" alt="" /></dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeAvatarMatch.formatter, {})}">${t('changeAvatar')(visuallyHidden)}</a>
                    </li>
                    <li>
                      <a href="${format(removeAvatarMatch.formatter, {})}">${t('removeAvatar')(visuallyHidden)}</a>
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
                <dt>${t('slackCommunityName')()}</dt>
                <dd>
                  <a href="${format(connectSlackMatch.formatter, {})}">${t('connectSlack')()}</a>
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            slackUser => html`
              <div>
                <dt>${t('slackCommunityName')()}</dt>
                <dd>
                  <span class="slack">
                    <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                    <bdi translate="no">${slackUser.name}</bdi>
                  </span>
                </dd>
                <dd>
                  <a href="${format(disconnectSlackMatch.formatter, {})}">${t('disconnectSlack')(visuallyHidden)}</a>
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
                <dt>${t('emailAddress')()}</dt>
                <dd>
                  <a href="${format(changeContactEmailAddressMatch.formatter, {})}">${t('enterEmailAddress')()}</a>
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            contactEmailAddress => html`
              <div>
                <dt>${t('emailAddress')()}</dt>
                <dd>
                  ${contactEmailAddress.value}
                  ${Match.valueTags(contactEmailAddress, {
                    VerifiedContactEmailAddress: () => '',
                    UnverifiedContactEmailAddress: () => html`<small>${t('unverified')()}</small>`,
                  })}
                </dd>
                <dd>
                  <a href="${format(changeContactEmailAddressMatch.formatter, {})}"
                    >${t('changeEmailAddress')(visuallyHidden)}</a
                  >
                </dd>
              </div>
            `,
          )
          .exhaustive()}
        ${
          Option.isSome(contactEmailAddress) && contactEmailAddress.value._tag === 'VerifiedContactEmailAddress'
            ? pipe(
                Match.value(requestedReviewNotifications),
                Match.when(
                  false,
                  () => html`
                    <div>
                      <dt>${t('requestedReviewNotifications')()}</dt>
                      <dd>${t('requestedReviewNotificationsOff')()}</dd>
                      <dd>
                        <a href="${Routes.ChangeRequestedReviewNotifications}"
                          >${t('changeRequestedReviewNotifications')(visuallyHidden)}</a
                        >
                      </dd>
                    </div>
                  `,
                ),
                Match.when(
                  true,
                  () => html`
                    <div>
                      <dt>${t('requestedReviewNotifications')()}</dt>
                      <dd>${t('requestedReviewNotificationsOn')()}</dd>
                      <dd>
                        <a href="${Routes.ChangeRequestedReviewNotifications}"
                          >${t('changeRequestedReviewNotifications')(visuallyHidden)}</a
                        >
                      </dd>
                    </div>
                  `,
                ),
                Match.exhaustive,
              )
            : ''
        }
        ${match(slackUser)
          .when(Option.isNone, () => '')
          .when(
            Option.isSome,
            () => html`
              <div>
                <dt>${t('openReviewRequests')()}</dt>
                ${match(openForRequests)
                  .when(
                    Option.isNone,
                    () => html`
                      <dd>
                        <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                          >${t('enterPreferenceReviewRequests')()}</a
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
                              html`${t('yes')()}
                                <small
                                  >${match(openForRequests.visibility)
                                    .with('public', () => t('shownPublic')())
                                    .with('restricted', () => t('restricted')())
                                    .exhaustive()}</small
                                > `,
                          )
                          .with({ value: false }, () => t('no')())
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
                                    >${t('changePreferenceReviewRequests')(visuallyHidden)}</a
                                  >
                                </li>
                                <li>
                                  <a href="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}"
                                    >${t('setPreferenceReviewRequestsVisibility')(visuallyHidden)}</a
                                  >
                                </li>
                              </ul>
                            `,
                          )
                          .with(
                            { value: false },
                            () => html`
                              <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                >${t('changePreferenceReviewRequests')(visuallyHidden)}</a
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
          <dt>${t('careerStage')()}</dt>
          ${match(careerStage)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeCareerStageMatch.formatter, {})}">${t('enterCareerStage')()}</a>
                </dd>
              `,
            )
            .with(
              { value: P.select() },
              careerStage => html`
                <dd>
                  ${t(careerStage.value)()}
                  <small
                    >${match(careerStage.visibility)
                      .with('public', () => t('shownPublic')())
                      .with('restricted', () => t('restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeCareerStageMatch.formatter, {})}"
                        >${t('changeCareerStage')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeCareerStageVisibilityMatch.formatter, {})}"
                        >${t('setCareerStageVisibility')(visuallyHidden)}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt>${t('researchInterests')()}</dt>
          ${match(researchInterests)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeResearchInterestsMatch.formatter, {})}">${t('enterResearchInterests')()}</a>
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
                      .with('public', () => t('shownPublic')())
                      .with('restricted', () => t('restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeResearchInterestsMatch.formatter, {})}"
                        >${t('changeResearchInterests')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeResearchInterestsVisibilityMatch.formatter, {})}"
                        >${t('setResearchInterestsVisibility')(visuallyHidden)}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt>${t('location')()}</dt>
          ${match(location)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeLocationMatch.formatter, {})}">${t('enterLocation')()}</a>
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
                      .with('public', () => t('shownPublic')())
                      .with('restricted', () => t('restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeLocationMatch.formatter, {})}">${t('changeLocation')(visuallyHidden)}</a>
                    </li>
                    <li>
                      <a href="${format(changeLocationVisibilityMatch.formatter, {})}"
                        >${t('setLocationVisibility')(visuallyHidden)}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt>${t('languages')()}</dt>
          ${match(languages)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeLanguagesMatch.formatter, {})}">${t('enterLanguages')()}</a>
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
                      .with('public', () => t('shownPublic')())
                      .with('restricted', () => t('restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeLanguagesMatch.formatter, {})}"
                        >${t('changeLanguages')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLanguagesVisibilityMatch.formatter, {})}"
                        >${t('setLanguagesVisibility')(visuallyHidden)}</a
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

const visuallyHidden = {
  visuallyHidden: (text: Html) => html`<span class="visually-hidden">${text}</span>`,
}
