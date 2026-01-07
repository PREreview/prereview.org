import { Array, Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { match, P } from 'ts-pattern'
import type { CareerStage } from '../../career-stage.ts'
import type { ContactEmailAddress } from '../../contact-email-address.ts'
import { html, plainText, rawHtml } from '../../html.ts'
import type { IsOpenForRequests } from '../../is-open-for-requests.ts'
import type { Languages } from '../../languages.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { Location } from '../../location.ts'
import type { OrcidToken } from '../../orcid-token.ts'
import type { ResearchInterests } from '../../research-interests.ts'
import { PageResponse } from '../../Response/index.ts'
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
import { getKeywordName, type KeywordId } from '../../types/Keyword.ts'
import type { UserOnboarding } from '../../user-onboarding.ts'
import type { User } from '../../user.ts'

export function createPage({
  user,
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
  subscribedKeywords = Option.none(),
}: {
  user: User
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
  subscribedKeywords?: Option.Option<ReadonlyArray<KeywordId>>
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
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(user.orcid) })}" class="forward"
            ><span>${t('my-details', 'viewPublicProfile')()}</span></a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(user.pseudonym) })}"
            class="forward"
            ><span>${t('my-details', 'viewPseudonymProfile')()}</span></a
          >
        </div>
      </div>

      <dl class="summary-list">
        <div>
          <dt><span>${t('my-details', 'name')()}</span></dt>
          <dd>${user.name}</dd>
        </div>

        <div>
          <dt><span>ORCID iD</span></dt>
          <dd><span class="orcid-id">${user.orcid}</span></dd>
        </div>

        <div>
          <dt><span>${t('my-details', 'pseudonym')()}</span></dt>
          <dd>${user.pseudonym}</dd>
        </div>

        ${match(orcidToken)
          .when(
            Option.isNone,
            () => html`
              <div>
                <dt><span>${t('my-details', 'orcidRecord')()}</span></dt>
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
                <dt><span>${t('my-details', 'orcidRecord')()}</span></dt>
                <dd>${t('my-details', 'connected')()}</dd>
                <dd>
                  <a href="${format(disconnectOrcidMatch.formatter, {})}"
                    >${rawHtml(t('my-details', 'disconnectOrcidRecord')(visuallyHidden))}</a
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
                <dt><span>${t('my-details', 'avatar')()}</span></dt>
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
                <dt><span>${t('my-details', 'avatar')()}</span></dt>
                <dd><img src="${avatar.href}" width="300" height="300" alt="" /></dd>
                <dd>
                  <ul>
                    <li>
                      <a href="${format(changeAvatarMatch.formatter, {})}"
                        >${rawHtml(t('my-details', 'changeAvatar')(visuallyHidden))}</a
                      >
                    </li>
                    <li>
                      <a href="${format(removeAvatarMatch.formatter, {})}"
                        >${rawHtml(t('my-details', 'removeAvatar')(visuallyHidden))}</a
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
                <dt><span>${t('my-details', 'slackCommunityName')()}</span></dt>
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
                <dt><span>${t('my-details', 'slackCommunityName')()}</span></dt>
                <dd>
                  <span class="slack">
                    <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                    <span>${slackUser.name}</span>
                  </span>
                </dd>
                <dd>
                  <a href="${format(disconnectSlackMatch.formatter, {})}"
                    >${rawHtml(t('my-details', 'disconnectSlack')(visuallyHidden))}</a
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
                <dt><span>${t('my-details', 'emailAddress')()}</span></dt>
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
                <dt><span>${t('my-details', 'emailAddress')()}</span></dt>
                <dd>
                  ${contactEmailAddress.value}
                  ${Match.valueTags(contactEmailAddress, {
                    VerifiedContactEmailAddress: () => '',
                    UnverifiedContactEmailAddress: () => html`<small>${t('my-details', 'unverified')()}</small>`,
                  })}
                </dd>
                <dd>
                  <a href="${format(changeContactEmailAddressMatch.formatter, {})}"
                    >${rawHtml(t('my-details', 'changeEmailAddress')(visuallyHidden))}</a
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
                <dt><span>${t('my-details', 'openReviewRequests')()}</span></dt>
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
                                    >${rawHtml(t('my-details', 'changePreferenceReviewRequests')(visuallyHidden))}</a
                                  >
                                </li>
                                <li>
                                  <a href="${format(changeOpenForRequestsVisibilityMatch.formatter, {})}"
                                    >${rawHtml(
                                      t('my-details', 'setPreferenceReviewRequestsVisibility')(visuallyHidden),
                                    )}</a
                                  >
                                </li>
                              </ul>
                            `,
                          )
                          .with(
                            { value: false },
                            () => html`
                              <a href="${format(changeOpenForRequestsMatch.formatter, {})}"
                                >${rawHtml(t('my-details', 'changePreferenceReviewRequests')(visuallyHidden))}</a
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
          <dt><span>${t('my-details', 'careerStage')()}</span></dt>
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
                        >${rawHtml(t('my-details', 'changeCareerStage')(visuallyHidden))}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeCareerStageVisibilityMatch.formatter, {})}"
                        >${rawHtml(t('my-details', 'setCareerStageVisibility')(visuallyHidden))}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt><span>${t('my-details', 'researchInterests')()}</span></dt>
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
                        >${rawHtml(t('my-details', 'changeResearchInterests')(visuallyHidden))}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeResearchInterestsVisibilityMatch.formatter, {})}"
                        >${rawHtml(t('my-details', 'setResearchInterestsVisibility')(visuallyHidden))}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        ${Option.match(subscribedKeywords, {
          onNone: () => '',
          onSome: subscribedKeywords => html`
            <div>
              <dt><span>Subscribed keywords</span></dt>
              ${Array.match(subscribedKeywords, {
                onEmpty: () => html`
                  <dd>
                    <a href="${Routes.SubscribeToKeywords}">Subscribe to keywords</a>
                  </dd>
                `,
                onNonEmpty: currentKeywords => html`
                  <dd>${pipe(Array.map(currentKeywords, getKeywordName), formatList(locale))}.</dd>
                  <dd>
                    <a href="${Routes.SubscribeToKeywords}">Subscribe to keywords</a>
                  </dd>
                `,
              })}
            </div>
          `,
        })}

        <div>
          <dt><span>${t('my-details', 'location')()}</span></dt>
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
                        >${rawHtml(t('my-details', 'changeLocation')(visuallyHidden))}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLocationVisibilityMatch.formatter, {})}"
                        >${rawHtml(t('my-details', 'setLocationVisibility')(visuallyHidden))}</a
                      >
                    </li>
                  </ul>
                </dd>
              `,
            )
            .exhaustive()}
        </div>

        <div>
          <dt><span>${t('my-details', 'languages')()}</span></dt>
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
                        >${rawHtml(t('my-details', 'changeLanguages')(visuallyHidden))}</a
                      >
                    </li>
                    <li>
                      <a href="${format(changeLanguagesVisibilityMatch.formatter, {})}"
                        >${rawHtml(t('my-details', 'setLanguagesVisibility')(visuallyHidden))}</a
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

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<string>) => string {
  const formatter = new Intl.ListFormat(...args)

  return list => formatter.format(list)
}

const visuallyHidden = {
  visuallyHidden: (text: string) => html`<span class="visually-hidden">${text}</span>`.toString(),
}
