import textClipper from '@arendjr/text-clipper'
import { isDoi, toUrl } from 'doi-ts'
import { Array, flow, identity, pipe, String, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { match, P, P as p } from 'ts-pattern'
import { getClubName } from '../../Clubs/index.ts'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Personas from '../../Personas/index.ts'
import type { RapidPrereview } from '../../PreprintReviews/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type { PreprintPrereview } from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { preprintReviewsMatch, profileMatch, reviewMatch, writeReviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { ProfileId } from '../../types/index.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { isPseudonym } from '../../types/Pseudonym.ts'
import { TwoUpPageResponse } from '../Response/index.ts'

export const createPage = ({
  locale,
  preprint,
  reviews,
  rapidPrereviews,
}: {
  locale: SupportedLocale
  preprint: Preprints.Preprint
  reviews: ReadonlyArray<PreprintPrereview>
  rapidPrereviews: ReadonlyArray<RapidPrereview>
}) =>
  TwoUpPageResponse({
    title: plainText(translate(locale, 'preprint-reviews', 'prereviewsOf')({ preprint: preprint.title.text })),
    description: plainText`${translate(locale, 'preprint-reviews', 'authoredBy')({ authors: pipe(preprint.authors, Array.map(displayAuthor), formatList(locale)), visuallyHidden: identity })}
    ${
      preprint.abstract
        ? plainText`
            ${translate(locale, 'preprint-reviews', 'abstractHeading')()}

            ${preprint.abstract.text}
          `
        : ''
    }
    `,
    h1: translate(
      locale,
      'preprint-reviews',
      'prereviewsOf',
    )({
      preprint: html`<cite ${languageAttributesFor(preprint.title.language)}>${preprint.title.text}</cite>`,
    }),
    aside: html`
      <article aria-labelledby="preprint-title">
        <header>
          <h2 ${languageAttributesFor(preprint.title.language)} id="preprint-title">${preprint.title.text}</h2>

          <div class="byline">
            ${translate(
              locale,
              'preprint-reviews',
              'authoredBy',
            )({
              authors: pipe(preprint.authors, Array.map(displayAuthor), formatList(locale)),
              visuallyHidden,
            })}
          </div>

          <dl>
            <div>
              <dt>${translate(locale, 'preprint-reviews', 'posted')()}</dt>
              <dd>${renderDate(locale)(preprint.posted)}</dd>
            </div>
            <div>
              <dt>${translate(locale, 'preprint-reviews', 'server')()}</dt>
              <dd>${Preprints.getServerName(preprint.id)}</dd>
            </div>
            ${match(preprint.id)
              .with(
                { _tag: 'PhilsciPreprintId' },
                id => html`
                  <div>
                    <dt>${translate(locale, 'preprint-reviews', 'itemId')()}</dt>
                    <dd>${id.value}</dd>
                  </div>
                `,
              )
              .with(
                { value: p.when(isDoi) },
                id => html`
                  <div>
                    <dt>DOI</dt>
                    <dd><a href="${toUrl(id.value).href}" class="doi" dir="auto" translate="no">${id.value}</a></dd>
                  </div>
                `,
              )
              .exhaustive()}
          </dl>
        </header>

        ${preprint.abstract
          ? html`
              <h3>${translate(locale, 'preprint-reviews', 'abstractHeading')()}</h3>

              <div ${languageAttributesFor(preprint.abstract.language)}>
                ${fixHeadingLevels(3, preprint.abstract.text)}
              </div>
            `
          : ''}

        <a href="${preprint.url.href}" class="button">${translate(locale, 'preprint-reviews', 'readPreprint')()}</a>
      </article>
    `,
    main: html`
      ${Array.match(rapidPrereviews, {
        onEmpty: () => '',
        onNonEmpty: rapidPrereviews => showRapidPrereviews(rapidPrereviews, preprint, locale),
      })}

      <h2>${translate(locale, 'preprint-reviews', 'prereviews')({ number: reviews.length })}</h2>

      <div class="button-group" role="group">
        <a href="${format(writeReviewMatch.formatter, { id: preprint.id })}" class="button"
          >${translate(locale, 'preprint-reviews', 'writeAPrereview')()}</a
        >

        <a href="${Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint.id })}"
          >${translate(locale, 'preprint-reviews', 'requestAPrereview')()}</a
        >
      </div>

      ${Array.match(reviews, {
        onEmpty: () => '',
        onNonEmpty: reviews => html`
          <ol class="cards">
            ${reviews.map(review => showReview(review, locale))}
          </ol>
        `,
      })}
    `,
    canonical: format(preprintReviewsMatch.formatter, { id: preprint.id }),
    type: 'preprint',
  })

function showReview(review: PreprintPrereview, locale: SupportedLocale) {
  const t = translate(locale, 'preprint-reviews')
  return html`
    <li>
      <article aria-labelledby="prereview-${review.id}-title">
        <header>
          <h3 class="visually-hidden" id="prereview-${review.id}-title">
            ${match([countAuthors(review), review.club])
              .with([1, P.string], ([, club]) =>
                t('prereviewByOneAuthorInClub')({
                  author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                  club: html`<bdi>${getClubName(club)}</bdi>`,
                }),
              )
              .with([1, undefined], () =>
                t('prereviewByOneAuthor')({ author: html`<bdi>${review.authors.named[0].name}</bdi>` }),
              )
              .with([P.number, P.string], ([, club]) =>
                t('prereviewByMultipleAuthorsInClub')({
                  author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                  club: html`<bdi>${getClubName(club)}</bdi>`,
                }),
              )
              .with([P.number, undefined], () =>
                t('prereviewByMultipleAuthors')({
                  author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                }),
              )
              .exhaustive()}
          </h3>

          <div class="byline">
            ${pipe(
              review.authors.named,
              Array.map(({ name }) => html`<bdi>${name}</bdi>`),
              Array.appendAll(
                review.authors.anonymous > 0 ? [t('otherAuthors')({ number: review.authors.anonymous })] : [],
              ),
              formatList(locale),
              authors =>
                review.club
                  ? t('authoredByInClub')({
                      authors,
                      club: html`<bdi>${getClubName(review.club)}</bdi>`,
                      visuallyHidden,
                    })
                  : t('authoredBy')({ authors, visuallyHidden }),
            )}
          </div>
        </header>

        <div ${review.language ? languageAttributesFor(review.language) : ''}>
          ${fixHeadingLevels(
            3,
            rawHtml(textClipper(review.text.toString(), 300, { html: true, maxLines: 5, stripTags: ['a'] })),
          )}
        </div>

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          ${match([countAuthors(review), review.club])
            .with([1, P.string], ([, club]) =>
              t('readPrereviewByOneAuthorInClub')({
                author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                club: html`<bdi>${getClubName(club)}</bdi>`,
                visuallyHidden,
              }),
            )
            .with([1, undefined], () =>
              t('readPrereviewByOneAuthor')({
                author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                visuallyHidden,
              }),
            )
            .with([P.number, P.string], ([, club]) =>
              t('readPrereviewByMultipleAuthorsInClub')({
                author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                club: html`<bdi>${getClubName(club)}</bdi>`,
                visuallyHidden,
              }),
            )
            .with([P.number, undefined], () =>
              t('readPrereviewByMultipleAuthors')({
                author: html`<bdi>${review.authors.named[0].name}</bdi>`,
                visuallyHidden,
              }),
            )
            .exhaustive()}
        </a>
      </article>
    </li>
  `
}

function showRapidPrereviews(
  rapidPrereviews: Array.NonEmptyReadonlyArray<RapidPrereview>,
  preprint: Preprints.Preprint,
  locale: SupportedLocale,
): Html {
  const t = translate(locale, 'preprint-reviews')

  return html`
    <h2>${t('rapidPrereviews')({ number: rapidPrereviews.length })}</h2>

    <div class="byline">
      ${t('authoredBy')({
        authors: pipe(rapidPrereviews, Array.map(flow(Struct.get('author'), displayPersona)), formatList(locale)),
        visuallyHidden,
      })}
    </div>

    <details>
      <summary><span>${t('whereCanRapidPrereview')()}</span></summary>

      <div>
        <p>
          ${t('rapidReplacedWith')({
            link: text =>
              html`<a href="https://content.prereview.org/introducing-structured-prereviews-on-prereview-org/"
                >${text}</a
              >`,
          })}
        </p>

        <p>
          ${t('writeStructuredPrereview')({
            link: text => html`<a href="${format(writeReviewMatch.formatter, { id: preprint.id })}">${text}</a>`,
          })}
        </p>

        <p>${t('updatingRapidPrereviews')()}</p>
      </div>
    </details>

    <div role="region" aria-labelledby="rapid-prereviews-caption" tabindex="0">
      <table>
        <caption id="rapid-prereviews-caption" class="visually-hidden">
          ${t('aggregatedRapidPreviews')()}
        </caption>
        <thead>
          <tr>
            <th scope="col"><span class="visually-hidden">${t('question')()}</span></th>
            <th scope="col">${t('yes')()}</th>
            <th scope="col">${t('unsure')()}</th>
            <th scope="col">${t('na')()}</th>
            <th scope="col">${t('no')()}</th>
          </tr>
        </thead>
        <tbody>
          ${pipe(
            [
              'novel',
              'future',
              'reproducibility',
              'methods',
              'coherent',
              'limitations',
              'ethics',
              'newData',
              'availableData',
              'availableCode',
              'recommend',
              'peerReview',
            ] satisfies Array.NonEmptyReadonlyArray<keyof RapidPrereview['questions']>,
            Array.map(question => ({
              question,
              answers: {
                yes: countRapidPrereviewResponses(rapidPrereviews, question, 'yes'),
                unsure: countRapidPrereviewResponses(rapidPrereviews, question, 'unsure'),
                na: countRapidPrereviewResponses(rapidPrereviews, question, 'not applicable'),
                no: countRapidPrereviewResponses(rapidPrereviews, question, 'no'),
              },
            })),
            Array.map(
              ({ question, answers }) => html`
                <tr>
                  <th scope="row">${t(`rapid${String.capitalize(question)}`)()}</th>
                  <td class="numeric">
                    ${(answers.yes / rapidPrereviews.length).toLocaleString(locale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td class="numeric">
                    ${(answers.unsure / rapidPrereviews.length).toLocaleString(locale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td class="numeric">
                    ${(answers.na / rapidPrereviews.length).toLocaleString(locale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td class="numeric">
                    ${(answers.no / rapidPrereviews.length).toLocaleString(locale, {
                      style: 'percent',
                      maximumFractionDigits: 0,
                    })}
                  </td>
                </tr>
              `,
            ),
          )}
        </tbody>
      </table>
    </div>
  `
}

const displayPersona = Personas.match({
  onPublic: persona =>
    html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      class="orcid"
      dir="auto"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" dir="auto"
      >${persona.pseudonym}</a
    >`,
})

function displayAuthor({ name, orcid }: { name: string; orcid?: OrcidId }) {
  if (orcid) {
    return html`<a
      href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}"
      class="orcid"
      dir="auto"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}" dir="auto"
      >${name}</a
    >`
  }

  return html`<bdi>${name}</bdi>`
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

function countRapidPrereviewResponses<Q extends keyof RapidPrereview['questions']>(
  rapidPrereviews: ReadonlyArray<RapidPrereview>,
  question: Q,
  response: RapidPrereview['questions'][Q],
) {
  return rapidPrereviews.reduce(
    (total, rapidPrereview) => total + (rapidPrereview.questions[question] === response ? 1 : 0),
    0,
  )
}

const countAuthors = (prereview: PreprintPrereview) => prereview.authors.named.length + prereview.authors.anonymous

const visuallyHidden = (text: Html) => html`<span class="visually-hidden">${text}</span>`
