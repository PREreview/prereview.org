import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { html, plainText, rawHtml } from '../html.js'
import { translate, type SupportedLocale } from '../locales/index.js'
import { PageResponse } from '../response.js'
import { requestAPrereviewMatch } from '../routes.js'
import type { IndeterminatePreprintId } from '../types/preprint-id.js'

export const unknownPreprintPage = (preprint: IndeterminatePreprintId, locale: SupportedLocale) => {
  return PageResponse({
    status: Status.BadRequest,
    title: plainText(translate(locale, 'request-a-prereview-page', 'dontKnowPreprint')()),
    main: html`
      <h1>${translate(locale, 'request-a-prereview-page', 'dontKnowPreprint')()}</h1>

      ${preprint._tag === 'PhilsciPreprintId'
        ? html`
            <p>
              ${rawHtml(
                translate(
                  locale,
                  'request-a-prereview-page',
                  'urlCouldBePhilsci',
                )({
                  url: html`<q class="select-all" translate="no"
                    >https://philsci-archive.pitt.edu/${preprint.value}/</q
                  >`.toString(),
                }),
              )}
            </p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkCorrectUrl')()}</p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkPastedUrl')()}</p>

            <p>${rawHtml(translate(locale, 'request-a-prereview-page', 'urlIsCorrect')({ contact: mailToHelp }))}</p>
          `
        : html`
            <p>
              ${rawHtml(
                Match.valueTags(preprint, {
                  AdvancePreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAdvance'),
                  africarxiv: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAfricarxiv'),
                  ArcadiaSciencePreprintId: () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeArcadiaScience'),
                  ArxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeArxiv'),
                  AuthoreaPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeAuthorea'),
                  BiorxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeBiorxiv'),
                  'biorxiv-medrxiv': () => translate(locale, 'request-a-prereview-page', 'doiCouldBeBiorxivMedrxiv'),
                  ChemrxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeChemrxiv'),
                  CurvenotePreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeCurvenote'),
                  EartharxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEartharxiv'),
                  EcoevorxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEcoevorxiv'),
                  EdarxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEdarxiv'),
                  EngrxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeEngrxiv'),
                  JxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeJxiv'),
                  LifecycleJournalPreprintId: () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeLifecycleJournal'),
                  MedrxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeMedrxiv'),
                  MetaarxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeMetaarxiv'),
                  NeurolibrePreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeNeurolibre'),
                  OsfPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeOsf'),
                  OsfPreprintsPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeOsf'),
                  'osf-lifecycle-journal': () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeOsfLifecycleJournal'),
                  PreprintsorgPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBePreprintsorg'),
                  PsyarxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBePsyarxiv'),
                  PsychArchivesPreprintId: () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBePsycharchives'),
                  ResearchSquarePreprintId: () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeResearchSquare'),
                  ScieloPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeScielo'),
                  ScienceOpenPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeScienceOpen'),
                  SocarxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeSocarxiv'),
                  SsrnPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeSsrn'),
                  TechrxivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeTechrxiv'),
                  VerixivPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeVerixiv'),
                  ZenodoPreprintId: () => translate(locale, 'request-a-prereview-page', 'doiCouldBeZenodo'),
                  'zenodo-africarxiv': () =>
                    translate(locale, 'request-a-prereview-page', 'doiCouldBeZenodoAfricarxiv'),
                })({ doi: html`<q class="select-all" translate="no">${preprint.value}</q>`.toString() }),
              )}
            </p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkCorrectDoi')()}</p>

            <p>${translate(locale, 'request-a-prereview-page', 'checkPastedDoi')()}</p>

            <p>${rawHtml(translate(locale, 'request-a-prereview-page', 'doiIsCorrect')({ contact: mailToHelp }))}</p>
          `}

      <a href="${format(requestAPrereviewMatch.formatter, {})}" class="button"
        >${translate(locale, 'forms', 'backLink')()}</a
      >
    `,
  })
}

const mailToHelp = (text: string) => html`<a href="mailto:help@prereview.org">${text}</a>`.toString()
