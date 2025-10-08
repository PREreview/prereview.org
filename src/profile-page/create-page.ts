import { Array, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { getClubName } from '../Clubs/index.ts'
import { type Html, html, plainText, rawHtml } from '../html.ts'
import { type SupportedLocale, translate } from '../locales/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import { profileMatch } from '../routes.ts'
import { ProfileId } from '../types/index.ts'
import type { OrcidProfile } from './orcid-profile.ts'
import type { PseudonymProfile } from './pseudonym-profile.ts'
import { renderListOfPrereviews } from './render-list-of-prereviews.ts'

export function createPage(profile: OrcidProfile | PseudonymProfile, locale: SupportedLocale) {
  return PageResponse({
    title: plainText(
      match(profile)
        .with({ name: P.string }, profile => profile.name)
        .with({ orcid: P.string }, profile => profile.orcid)
        .exhaustive(),
    ),
    main: match(profile)
      .with({ type: 'orcid' }, profile => renderContentForOrcidId(profile, locale))
      .with({ type: 'pseudonym' }, profile => renderContentForPseudonym(profile, locale))
      .exhaustive(),
    canonical: format(profileMatch.formatter, {
      profile: match(profile)
        .returnType<ProfileId.ProfileId>()
        .with({ type: 'orcid', orcid: P.select(P.string) }, ProfileId.forOrcid)
        .with({ type: 'pseudonym', name: P.select(P.string) }, ProfileId.forPseudonym)
        .exhaustive(),
    }),
  })
}

function renderContentForOrcidId(
  {
    name,
    orcid,
    slackUser,
    careerStage,
    researchInterests,
    location,
    languages,
    clubs,
    avatar,
    isOpenForRequests,
    prereviews,
  }: OrcidProfile,
  locale: SupportedLocale,
) {
  return html`
    <div class="profile-header">
      <div>
        <h1>
          ${match({ name, orcid })
            .with({ name: P.string }, profile => profile.name)
            .with({ orcid: P.string }, () => translate(locale, 'profile-page', 'anonymous')())
            .exhaustive()}
        </h1>

        <dl class="summary-list">
          <div>
            <dt><span>ORCID iD</span></dt>
            <dd><a href="https://orcid.org/${orcid}" class="orcid-id">${orcid}</a></dd>
          </div>

          ${slackUser
            ? html`
                <div>
                  <dt><span>${translate(locale, 'profile-page', 'slackName')()}</span></dt>
                  <dd>
                    <span class="slack">
                      <img src="${slackUser.image.href}" alt="" width="48" height="48" />
                      <span>${slackUser.name}</span>
                    </span>
                  </dd>
                </div>
              `
            : ''}
          ${careerStage
            ? html`
                <div>
                  <dt><span>${translate(locale, 'profile-page', 'careerStage')()}</span></dt>
                  <dd>${translate(locale, 'profile-page', `careerStage${capitalize(careerStage)}`)()}</dd>
                </div>
              `
            : ''}
          ${researchInterests
            ? html`
                <div>
                  <dt><span>${translate(locale, 'profile-page', 'researchInterests')()}</span></dt>
                  <dd>${researchInterests}</dd>
                </div>
              `
            : ''}
          ${location
            ? html`
                <div>
                  <dt><span>${translate(locale, 'profile-page', 'location')()}</span></dt>
                  <dd>${location}</dd>
                </div>
              `
            : ''}
          ${languages
            ? html`
                <div>
                  <dt><span>${translate(locale, 'profile-page', 'languages')()}</span></dt>
                  <dd>${languages}</dd>
                </div>
              `
            : ''}
          ${Array.isNonEmptyReadonlyArray(clubs)
            ? html`
                <div>
                  <dt><span>${translate(locale, 'profile-page', 'clubs')()}</span></dt>
                  <dd>
                    ${pipe(
                      clubs,
                      Array.map(
                        club => html`<a href="${Routes.ClubProfile.href({ id: club })}">${getClubName(club)}</a>`,
                      ),
                      formatList(locale),
                    )}
                  </dd>
                </div>
              `
            : ''}
        </dl>
      </div>

      ${avatar instanceof URL ? html` <img src="${avatar.href}" width="300" height="300" alt="" /> ` : ''}
    </div>

    <h2>${translate(locale, 'profile-page', 'prereviewsTitle')()}</h2>

    ${isOpenForRequests
      ? html`
          <div class="inset">
            ${name
              ? translate(locale, 'profile-page', 'openForRequests')({ name })
              : translate(locale, 'profile-page', 'openForRequestsAnonymous')()}
            ${slackUser
              ? rawHtml(
                  translate(
                    locale,
                    'profile-page',
                    'contactSlack',
                  )({
                    link: text =>
                      html`<a href="https://content.prereview.org/join-prereview-slack/">${text}</a>`.toString(),
                  }),
                )
              : ''}
          </div>
        `
      : ''}
    ${renderListOfPrereviews(prereviews, name, locale)}
  `
}

function renderContentForPseudonym({ name, prereviews }: PseudonymProfile, locale: SupportedLocale) {
  return html`
    <div class="profile-header">
      <div>
        <h1>${name}</h1>
      </div>
    </div>

    <h2>${translate(locale, 'profile-page', 'prereviewsTitle')()}</h2>

    ${renderListOfPrereviews(prereviews, name, locale)}
  `
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

function capitalize<T extends string>(self: T): Capitalize<T> {
  return ((self[0]?.toUpperCase() ?? '') + self.slice(1)) as Capitalize<T>
}
