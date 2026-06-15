import { Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { match, P } from 'ts-pattern'
import type { CareerStage } from '../../career-stage.ts'
import type { ContactEmailAddress } from '../../contact-email-address.ts'
import { html, plainText, type Html } from '../../html.ts'
import type { IsOpenForRequests } from '../../is-open-for-requests.ts'
import type { Languages } from '../../languages.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { Location } from '../../location.ts'
import type { OrcidToken } from '../../orcid-token.ts'
import type * as Personas from '../../Personas/index.ts'
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
  publicPersona: Personas.PublicPersona
  pseudonymPersona: Personas.PseudonymPersona
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
  const t = translate(locale)

  return PageResponse({
    title: plainText(t('my-details', 'myDetails')()),
    main: html`
      <h1>${t('my-details', 'myDetails')()}</h1>

      <div class="inset">
        ${match(userOnboarding)
          .with({ seenMyDetailsPage: false }, () => html`<p>${t('my-details', 'welcomeToPrereview')()}</p>`)
          .with({ seenMyDetailsPage: true }, () => '')
          .exhaustive()}

        <p>${t('my-details', 'onlyYouCanSee')()}</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(publicPersona) })}" class="forward"
            >${t('my-details', 'viewPublicProfile')()}</a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(pseudonymPersona) })}"
            class="forward"
            >${t('my-details', 'viewPseudonymProfile')()}</a
          >
        </div>
      </div>

      <dl class="summary-list">
        <div>
          <dt>${t('my-details', 'name')()}</dt>
          <dd>${publicPersona.name}</dd>
        </div>

        <div>
          <dt><span>ORCID iD</span></dt>
          <dd><span class="orcid-id">${publicPersona.orcidId}</span></dd>
        </div>

        <div>
          <dt>${t('my-details', 'pseudonym')()}</dt>
          <dd>${pseudonymPersona.pseudonym}</dd>
        </div>

        ${match(orcidToken)
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt>${t('my-details', 'orcidRecord')()}</dt>
                <dd>
                  <a href="${format(connectOrcidMatch.formatter, {})}">${t('my-details', 'connectOrcidRecord')()}</a>
                </dd>
              </div>
            `,
          )
          .when(
            Option.isSome,
            () => html`
              <div>
                <dt>${t('my-details', 'orcidRecord')()}</dt>
                <dd>${t('my-details', 'connected')()}</dd>
                <dd>
                  <a href="${format(disconnectOrcidMatch.formatter, {})}"
                    >${t('my-details', 'disconnectOrcidRecord')(visuallyHidden)}</a
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
                <dt>${t('my-details', 'avatar')()}</dt>
                <dd>
                  <a href="${format(changeAvatarMatch.formatter, {})}">${t('my-details', 'uploadAvatar')()}</a>
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            avatar => html`
              <div>
                <dt>${t('my-details', 'avatar')()}</dt>
                <dd><img src="${avatar.href}" width="300" height="300" alt="" /></dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeAvatarMatch.formatter, {})}"
                        >${t('my-details', 'changeAvatar')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(removeAvatarMatch.formatter, {})}"
                        >${t('my-details', 'removeAvatar')(visuallyHidden)}</a
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
                <dt>${t('my-details', 'slackCommunityName')()}</dt>
                <dd>
                  <a href="${format(connectSlackMatch.formatter, {})}">${t('my-details', 'connectSlack')()}</a>
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            slackUser => html`
              <div>
                <dt>${t('my-details', 'slackCommunityName')()}</dt>
                <dd>
                  <span class="slack">
                    <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                    <span>${slackUser.name}</span>
                  </span>
                </dd>
                <dd>
                  <a href="${format(disconnectSlackMatch.formatter, {})}"
                    >${t('my-details', 'disconnectSlack')(visuallyHidden)}</a
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
                <dt>${t('my-details', 'emailAddress')()}</dt>
                <dd>
                  <a href="${format(changeContactEmailAddressMatch.formatter, {})}"
                    >${t('my-details', 'enterEmailAddress')()}</a
                  >
                </dd>
              </div>
            `,
          )
          .with(
            { value: P.select() },
            contactEmailAddress => html`
              <div>
                <dt>${t('my-details', 'emailAddress')()}</dt>
                <dd>
                  ${contactEmailAddress.value}
                  ${Match.valueTags(contactEmailAddress, {
                    VerifiedContactEmailAddress: () => '',
                    UnverifiedContactEmailAddress: () => html`<small>${t('my-details', 'unverified')()}</small>`,
                  })}
                </dd>
                <dd>
                  <a href="${format(changeContactEmailAddressMatch.formatter, {})}"
                    >${t('my-details', 'changeEmailAddress')(visuallyHidden)}</a
                  >
                </dd>
              </div>
            `,
          )
          .exhaustive()}
        ${Option.isSome(contactEmailAddress) && contactEmailAddress.value._tag === 'VerifiedContactEmailAddress'
          ? pipe(
              Match.value(requestedReviewNotifications),
              Match.when(
                false,
                () => html`
                  <div>
                    <dt><span>Requested review notifications</span></dt>
                    <dd>Off</dd>
                    <dd>
                      <a href="${Routes.ChangeRequestedReviewNotifications}"
                        >Change <span class="visually-hidden">requested review notifications</span></a
                      >
                    </dd>
                  </div>
                `,
              ),
              Match.when(
                true,
                () => html`
                  <div>
                    <dt><span>Requested review notifications</span></dt>
                    <dd>On</dd>
                    <dd>
                      <a href="${Routes.ChangeRequestedReviewNotifications}"
                        >Change <span class="visually-hidden">requested review notifications</span></a
                      >
                    </dd>
                  </div>
                `,
              ),
              Match.exhaustive,
            )
          : ''}
        ${match(slackUser)
          .when(Option.isNone, () => '')
          .when(
            Option.isSome,
            () => html`
              <div>
                <dt>${t('my-details', 'openReviewRequests')()}</dt>
                ${match(openForRequests)
                  .when(
                    Option.isNone,
                    () => html`
                      <dd>
                        <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                          >${t('my-details', 'enterPreferenceReviewRequests')()}</a
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
                              html`${t('my-details', 'yes')()}
                                <small
                                  >${match(openForRequests.visibility)
                                    .with('public', () => t('my-details', 'shownPublic')())
                                    .with('restricted', () => t('my-details', 'restricted')())
                                    .exhaustive()}</small
                                > `,
                          )
                          .with({ value: false }, () => t('my-details', 'no')())
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
                                    >${t('my-details', 'changePreferenceReviewRequests')(visuallyHidden)}</a
                                  >
                                </li>
                                <li>
                                  <a href="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}"
                                    >${t('my-details', 'setPreferenceReviewRequestsVisibility')(visuallyHidden)}</a
                                  >
                                </li>
                              </ul>
                            `,
                          )
                          .with(
                            { value: false },
                            () => html`
                              <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                >${t('my-details', 'changePreferenceReviewRequests')(visuallyHidden)}</a
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
          <dt>${t('my-details', 'careerStage')()}</dt>
          ${match(careerStage)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeCareerStageMatch.formatter, {})}">${t('my-details', 'enterCareerStage')()}</a>
                </dd>
              `,
            )
            .with(
              { value: P.select() },
              careerStage => html`
                <dd>
                  ${t('my-details', careerStage.value)()}
                  <small
                    >${match(careerStage.visibility)
                      .with('public', () => t('my-details', 'shownPublic')())
                      .with('restricted', () => t('my-details', 'restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeCareerStageMatch.formatter, {})}"
                        >${t('my-details', 'changeCareerStage')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeCareerStageVisibilityMatch.formatter, {})}"
                        >${t('my-details', 'setCareerStageVisibility')(visuallyHidden)}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt>${t('my-details', 'researchInterests')()}</dt>
          ${match(researchInterests)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeResearchInterestsMatch.formatter, {})}"
                    >${t('my-details', 'enterResearchInterests')()}</a
                  >
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
                      .with('public', () => t('my-details', 'shownPublic')())
                      .with('restricted', () => t('my-details', 'restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeResearchInterestsMatch.formatter, {})}"
                        >${t('my-details', 'changeResearchInterests')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeResearchInterestsVisibilityMatch.formatter, {})}"
                        >${t('my-details', 'setResearchInterestsVisibility')(visuallyHidden)}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt>${t('my-details', 'location')()}</dt>
          ${match(location)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeLocationMatch.formatter, {})}">${t('my-details', 'enterLocation')()}</a>
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
                      .with('public', () => t('my-details', 'shownPublic')())
                      .with('restricted', () => t('my-details', 'restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeLocationMatch.formatter, {})}"
                        >${t('my-details', 'changeLocation')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLocationVisibilityMatch.formatter, {})}"
                        >${t('my-details', 'setLocationVisibility')(visuallyHidden)}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt>${t('my-details', 'languages')()}</dt>
          ${match(languages)
            .when(
              Option.isNone,
              () => html`
                <dd>
                  <a href="${format(changeLanguagesMatch.formatter, {})}">${t('my-details', 'enterLanguages')()}</a>
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
                      .with('public', () => t('my-details', 'shownPublic')())
                      .with('restricted', () => t('my-details', 'restricted')())
                      .exhaustive()}</small
                  >
                </dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeLanguagesMatch.formatter, {})}"
                        >${t('my-details', 'changeLanguages')(visuallyHidden)}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLanguagesVisibilityMatch.formatter, {})}"
                        >${t('my-details', 'setLanguagesVisibility')(visuallyHidden)}</a
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
