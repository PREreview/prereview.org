import textClipper from '@arendjr/text-clipper'
import { isDoi, toUrl } from 'doi-ts'
import { Array, flow, identity, pipe, String, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import type { Orcid } from 'orcid-id-ts'
import rtlDetect from 'rtl-detect'
import { match, P, P as p } from 'ts-pattern'
import { getClubName } from '../club-details.js'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import type { Preprint } from '../Preprints/index.js'
import * as PreprintServers from '../PreprintServers/index.js'
import { TwoUpPageResponse } from '../response.js'
import { isReviewRequestPreprintId } from '../review-request.js'
import { preprintReviewsMatch, profileMatch, requestReviewMatch, reviewMatch, writeReviewMatch } from '../routes.js'
import { renderDate } from '../time.js'
import { ProfileId } from '../types/index.js'
import { isPseudonym } from '../types/Pseudonym.js'
import type { Prereview } from './prereviews.js'
import type { RapidPrereview } from './rapid-prereviews.js'

export const createPage = ({
  locale,
  preprint,
  reviews,
  rapidPrereviews,
}: {
  locale: SupportedLocale
  preprint: Preprint
  reviews: ReadonlyArray<Prereview>
  rapidPrereviews: ReadonlyArray<RapidPrereview>
}) =>
  TwoUpPageResponse({
    title: plainText(
      translate(
        locale,
        'preprint-reviews',
        'prereviewsOf',
      )({ preprint: plainText`“${preprint.title.text}”`.toString() }),
    ),
    description: plainText`${rawHtml(translate(locale, 'preprint-reviews', 'authoredBy')({ authors: pipe(preprint.authors, Array.map(displayAuthor), formatList(locale), list => list.toString()), visuallyHidden: identity }))}
    ${
      preprint.abstract
        ? plainText`
            ${translate(locale, 'preprint-reviews', 'abstractHeading')()}

            ${preprint.abstract.text}
          `
        : ''
    }
    `,
    h1: rawHtml(
      translate(
        locale,
        'preprint-reviews',
        'prereviewsOf',
      )({
        preprint: html`<cite lang="${preprint.title.language}" dir="${rtlDetect.getLangDir(preprint.title.language)}"
          >${preprint.title.text}</cite
        >`.toString(),
      }),
    ),
    aside: html`
      <article aria-labelledby="preprint-title">
        <header>
          <h2
            lang="${preprint.title.language}"
            dir="${rtlDetect.getLangDir(preprint.title.language)}"
            id="preprint-title"
          >
            ${preprint.title.text}
          </h2>

          <div class="byline">
            ${rawHtml(
              translate(
                locale,
                'preprint-reviews',
                'authoredBy',
              )({
                authors: pipe(preprint.authors, Array.map(displayAuthor), formatList(locale), list => list.toString()),
                visuallyHidden,
              }),
            )}
          </div>

          <dl>
            <div>
              <dt>${translate(locale, 'preprint-reviews', 'posted')()}</dt>
              <dd>${renderDate(locale)(preprint.posted)}</dd>
            </div>
            <div>
              <dt>${translate(locale, 'preprint-reviews', 'server')()}</dt>
              <dd>${PreprintServers.getName(preprint.id)}</dd>
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
                    <dd><a href="${toUrl(id.value).href}" class="doi" translate="no">${id.value}</a></dd>
                  </div>
                `,
              )
              .exhaustive()}
          </dl>
        </header>

        ${preprint.abstract
          ? html`
              <h3>${translate(locale, 'preprint-reviews', 'abstractHeading')()}</h3>

              <div lang="${preprint.abstract.language}" dir="${rtlDetect.getLangDir(preprint.abstract.language)}">
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

        ${isReviewRequestPreprintId(preprint.id)
          ? html`<a href="${format(requestReviewMatch.formatter, { id: preprint.id })}"
              >${translate(locale, 'preprint-reviews', 'requestAPrereview')()}</a
            >`
          : ''}
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

function showReview(review: Prereview, locale: SupportedLocale) {
  const t = translate(locale, 'preprint-reviews')
  return html`
    <li>
      <article aria-labelledby="prereview-${review.id}-title">
        <header>
          <h3 class="visually-hidden" id="prereview-${review.id}-title">
            ${match([countAuthors(review), review.club])
              .with([1, P.string], ([, club]) =>
                t('prereviewByOneAuthorInClub')({ author: review.authors.named[0].name, club: getClubName(club) }),
              )
              .with([1, undefined], () => t('prereviewByOneAuthor')({ author: review.authors.named[0].name }))
              .with([P.number, P.string], ([, club]) =>
                t('prereviewByMultipleAuthorsInClub')({
                  author: review.authors.named[0].name,
                  club: getClubName(club),
                }),
              )
              .with([P.number, undefined], () =>
                t('prereviewByMultipleAuthors')({ author: review.authors.named[0].name }),
              )
              .exhaustive()}
          </h3>

          <div class="byline">
            ${pipe(
              review.authors.named,
              Array.map(Struct.get('name')),
              Array.appendAll(
                review.authors.anonymous > 0 ? [t('otherAuthors')({ number: review.authors.anonymous })] : [],
              ),
              formatList(locale),
              list => list.toString(),
              authors =>
                review.club
                  ? t('authoredByInClub')({ authors, club: getClubName(review.club), visuallyHidden })
                  : t('authoredBy')({ authors, visuallyHidden }),
              rawHtml,
            )}
          </div>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${rtlDetect.getLangDir(review.language)}"` : ''}>
          ${fixHeadingLevels(
            3,
            rawHtml(textClipper(review.text.toString(), 300, { html: true, maxLines: 5, stripTags: ['a'] })),
          )}
        </div>

        <a href="${format(reviewMatch.formatter, { id: review.id })}" class="more">
          ${rawHtml(
            match([countAuthors(review), review.club])
              .with([1, P.string], ([, club]) =>
                t('readPrereviewByOneAuthorInClub')({
                  author: review.authors.named[0].name,
                  club: getClubName(club),
                  visuallyHidden,
                }),
              )
              .with([1, undefined], () =>
                t('readPrereviewByOneAuthor')({ author: review.authors.named[0].name, visuallyHidden }),
              )
              .with([P.number, P.string], ([, club]) =>
                t('readPrereviewByMultipleAuthorsInClub')({
                  author: review.authors.named[0].name,
                  club: getClubName(club),
                  visuallyHidden,
                }),
              )
              .with([P.number, undefined], () =>
                t('readPrereviewByMultipleAuthors')({ author: review.authors.named[0].name, visuallyHidden }),
              )
              .exhaustive(),
          )}
        </a>
      </article>
    </li>
  `
}

function showRapidPrereviews(
  rapidPrereviews: Array.NonEmptyReadonlyArray<RapidPrereview>,
  preprint: Preprint,
  locale: SupportedLocale,
): Html {
  const t = translate(locale, 'preprint-reviews')

  return html`
    <h2>${t('rapidPrereviews')({ number: rapidPrereviews.length })}</h2>

    <div class="byline">
      ${rawHtml(
        t('authoredBy')({
          authors: pipe(
            rapidPrereviews,
            Array.map(flow(Struct.get('author'), displayAuthor)),
            formatList(locale),
            list => list.toString(),
          ),
          visuallyHidden,
        }),
      )}
    </div>

    <details>
      <summary><span>${t('whereCanRapidPrereview')()}</span></summary>

      <div>
        <p>
          ${t('rapidReplacedWith')({
            link: text =>
              html`<a href="https://content.prereview.org/introducing-structured-prereviews-on-prereview-org/"
                >${text}</a
              >`.toString(),
          })}
        </p>

        <p>
          ${t('writeStructuredPrereview')({
            link: text =>
              html`<a href="${format(writeReviewMatch.formatter, { id: preprint.id })}">${text}</a>`.toString(),
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
            ] as Array.NonEmptyReadonlyArray<keyof RapidPrereview['questions']>,
            Array.map(question => ({
              question,
              answers: {
                yes: countRapidPrereviewResponses(rapidPrereviews, question, 'yes'),
                unsure: countRapidPrereviewResponses(rapidPrereviews, question, 'unsure'),
                na: countRapidPrereviewResponses(rapidPrereviews, question, 'na'),
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

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(name) })}">${name}</a>`
  }

  return name
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

const countAuthors = (prereview: Prereview) => prereview.authors.named.length + prereview.authors.anonymous

const visuallyHidden = (text: string) => html`<span class="visually-hidden">${text}</span>`.toString()
