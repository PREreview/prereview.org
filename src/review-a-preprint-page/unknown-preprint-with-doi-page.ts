import type { Doi } from 'doi-ts'
import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { reviewAPreprintMatch } from '../routes.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'

export function createUnknownPreprintWithDoiPage(
  preprint: Extract<IndeterminatePreprintId, { value: Doi }>,
  locale: SupportedLocale,
) {
  const t = translate(locale)

  return PageResponse({
    status: Status.BadRequest,
    title: plainText(t('review-a-preprint', 'dontKnowPreprint')()),
    main: html`
      <h1>${t('review-a-preprint', 'dontKnowPreprint')()}</h1>

      <p>
        ${rawHtml(
          Match.valueTags(preprint, {
            advance: () => t('review-a-preprint', 'doiCouldBeAdvance'),
            africarxiv: () => t('review-a-preprint', 'doiCouldBeAfricarxiv'),
            'arcadia-science': () => t('review-a-preprint', 'doiCouldBeArcadiaScience'),
            arxiv: () => t('review-a-preprint', 'doiCouldBeArxiv'),
            authorea: () => t('review-a-preprint', 'doiCouldBeAuthorea'),
            biorxiv: () => t('review-a-preprint', 'doiCouldBeBiorxiv'),
            'biorxiv-medrxiv': () => t('review-a-preprint', 'doiCouldBeBiorxivMedrxiv'),
            chemrxiv: () => t('review-a-preprint', 'doiCouldBeChemrxiv'),
            curvenote: () => t('review-a-preprint', 'doiCouldBeCurvenote'),
            eartharxiv: () => t('review-a-preprint', 'doiCouldBeEartharxiv'),
            ecoevorxiv: () => t('review-a-preprint', 'doiCouldBeEcoevorxiv'),
            edarxiv: () => t('review-a-preprint', 'doiCouldBeEdarxiv'),
            engrxiv: () => t('review-a-preprint', 'doiCouldBeEngrxiv'),
            jxiv: () => t('review-a-preprint', 'doiCouldBeJxiv'),
            'lifecycle-journal': () => t('review-a-preprint', 'doiCouldBeLifecycleJournal'),
            medrxiv: () => t('review-a-preprint', 'doiCouldBeMedrxiv'),
            metaarxiv: () => t('review-a-preprint', 'doiCouldBeMetaarxiv'),
            neurolibre: () => t('review-a-preprint', 'doiCouldBeNeurolibre'),
            osf: () => t('review-a-preprint', 'doiCouldBeOsf'),
            'osf-preprints': () => t('review-a-preprint', 'doiCouldBeOsf'),
            'osf-lifecycle-journal': () => t('review-a-preprint', 'doiCouldBeOsfLifecycleJournal'),
            'preprints.org': () => t('review-a-preprint', 'doiCouldBePreprintsorg'),
            psyarxiv: () => t('review-a-preprint', 'doiCouldBePsyarxiv'),
            psycharchives: () => t('review-a-preprint', 'doiCouldBePsycharchives'),
            'research-square': () => t('review-a-preprint', 'doiCouldBeResearchSquare'),
            scielo: () => t('review-a-preprint', 'doiCouldBeScielo'),
            'science-open': () => t('review-a-preprint', 'doiCouldBeScienceOpen'),
            socarxiv: () => t('review-a-preprint', 'doiCouldBeSocarxiv'),
            ssrn: () => t('review-a-preprint', 'doiCouldBeSsrn'),
            techrxiv: () => t('review-a-preprint', 'doiCouldBeTechrxiv'),
            verixiv: () => t('review-a-preprint', 'doiCouldBeVerixiv'),
            zenodo: () => t('review-a-preprint', 'doiCouldBeZenodo'),
            'zenodo-africarxiv': () => t('review-a-preprint', 'doiCouldBeZenodoAfricarxiv'),
          })({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
        )}
      </p>

      <p>${t('review-a-preprint', 'checkCorrectDoi')()}</p>

      <p>${t('review-a-preprint', 'checkPastedDoi')()}</p>

      <p>${rawHtml(t('review-a-preprint', 'doiIsCorrect')({ contact: mailToHelp }))}</p>

      <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">${t('forms', 'backLink')()}</a>
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
