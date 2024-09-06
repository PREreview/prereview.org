import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { P, match } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { type Html, html, plainText, rawHtml } from '../html.js'
import { type SupportedLocale, translate } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { clubProfileMatch, profileMatch } from '../routes.js'
import type { ProfileId } from '../types/profile-id.js'
import type { OrcidProfile } from './orcid-profile.js'
import type { PseudonymProfile } from './pseudonym-profile.js'
import { renderListOfPrereviews } from './render-list-of-prereviews.js'

export function createPage(profile: OrcidProfile | PseudonymProfile, locale: SupportedLocale) {
  return PageResponse({
    title: plainText(
      match(profile)
        .with({ name: P.string }, profile => profile.name)
        .with({ orcid: P.string }, profile => profile.orcid)
        .exhaustive(),
    ),
    main: match(profile)
      .with({ type: 'orcid' }, profile => renderContentForOrcid(profile, locale))
      .with({ type: 'pseudonym' }, profile => renderContentForPseudonym(profile, locale))
      .exhaustive(),
    canonical: format(profileMatch.formatter, {
      profile: match(profile)
        .returnType<ProfileId>()
        .with({ type: 'orcid', orcid: P.select(P.string) }, value => ({ type: 'orcid', value }))
        .with({ type: 'pseudonym', name: P.select(P.string) }, value => ({ type: 'pseudonym', value }))
        .exhaustive(),
    }),
  })
}

function renderContentForOrcid(
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
            .with({ orcid: P.string }, () => translate(locale, 'profile-page')('anonymous')())
            .exhaustive()}
        </h1>

        <dl class="summary-list">
          <div>
            <dt>ORCID iD</dt>
            <dd><a href="https://orcid.org/${orcid}" class="orcid">${orcid}</a></dd>
          </div>

          ${slackUser
            ? html`
                <div>
                  <dt>${translate(locale, 'profile-page')('slackName')()}</dt>
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
                  <dt>${translate(locale, 'profile-page')('careerStage')()}</dt>
                  <dd>${translate(locale, 'profile-page')(`careerStage${capitalize(careerStage)}`)()}</dd>
                </div>
              `
            : ''}
          ${researchInterests
            ? html`
                <div>
                  <dt>${translate(locale, 'profile-page')('researchInterests')()}</dt>
                  <dd>${researchInterests}</dd>
                </div>
              `
            : ''}
          ${location
            ? html`
                <div>
                  <dt>${translate(locale, 'profile-page')('location')()}</dt>
                  <dd>${location}</dd>
                </div>
              `
            : ''}
          ${languages
            ? html`
                <div>
                  <dt>${translate(locale, 'profile-page')('languages')()}</dt>
                  <dd>${languages}</dd>
                </div>
              `
            : ''}
          ${RA.isNonEmpty(clubs)
            ? html`
                <div>
                  <dt>${translate(locale, 'profile-page')('clubs')()}</dt>
                  <dd>
                    ${pipe(
                      clubs,
                      RNEA.map(
                        club =>
                          html`<a href="${format(clubProfileMatch.formatter, { id: club })}">${getClubName(club)}</a>`,
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

    <h2>${translate(locale, 'profile-page')('prereviewsTitle')()}</h2>

    ${isOpenForRequests
      ? html`
          <div class="inset">
            ${name
              ? translate(locale, 'profile-page')('openForRequests')({ name })
              : translate(locale, 'profile-page')('openForRequestsAnonymous')()}
            ${slackUser
              ? rawHtml(
                  translate(locale, 'profile-page')('contactSlack')({
                    link: text =>
                      html`<a href="https://content.prereview.org/join-prereview-slack/">${text}</a>.`.toString(),
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

    <h2>${translate(locale, 'profile-page')('prereviewsTitle')()}</h2>

    ${renderListOfPrereviews(prereviews, name, locale)}
  `
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

function capitalize<T extends string>(self: T): Capitalize<T> {
  return ((self[0]?.toUpperCase() ?? '') + self.slice(1)) as Capitalize<T>
}
