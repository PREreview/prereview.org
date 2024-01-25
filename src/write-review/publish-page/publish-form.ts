import { format } from 'fp-ts-routing'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { P, match } from 'ts-pattern'
import { fixHeadingLevels, html, plainText, rawHtml } from '../../html'
import type { PreprintTitle } from '../../preprint'
import { StreamlinePageResponse } from '../../response'
import {
  profileMatch,
  writeReviewCompetingInterestsMatch,
  writeReviewConductMatch,
  writeReviewDataPresentationMatch,
  writeReviewFindingsNextStepsMatch,
  writeReviewIntroductionMatchesMatch,
  writeReviewLanguageEditingMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewNovelMatch,
  writeReviewPersonaMatch,
  writeReviewPublishMatch,
  writeReviewReadyFullReviewMatch,
  writeReviewResultsSupportedMatch,
  writeReviewReviewMatch,
  writeReviewShouldReadMatch,
} from '../../routes'
import { isPseudonym } from '../../types/pseudonym'
import type { User } from '../../user'
import type { CompletedForm } from '../completed-form'

export function publishForm(
  preprint: PreprintTitle,
  review: CompletedForm,
  user: User,
  message?: D.TypeOf<typeof FlashMessageD>,
) {
  return StreamlinePageResponse({
    title: plainText`Publish your PREreview of “${preprint.title}”`,
    nav: html` <a href="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" class="back">Back</a>`,
    main: html`
      ${match(message)
        .with(
          'contact-email-verified',
          () => html`
            <notification-banner aria-labelledby="notification-banner-title" role="alert">
              <h2 id="notification-banner-title">Success</h2>

              <p>Your email address has been verified.</p>
            </notification-banner>
          `,
        )
        .with(undefined, () => '')
        .exhaustive()}

      <single-use-form>
        <form method="post" action="${format(writeReviewPublishMatch.formatter, { id: preprint.id })}" novalidate>
          <h1>Check your PREreview</h1>

          <div class="summary-card">
            <div>
              <h2>Preprint details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>Title</dt>
                <dd>
                  <cite lang="${preprint.language}" dir="${getLangDir(preprint.language)}">${preprint.title}</cite>
                </dd>
              </div>
              <div>
                <dt>Preprint server</dt>
                <dd>
                  ${match(preprint.id.type)
                    .with('africarxiv', () => 'AfricArXiv Preprints')
                    .with('arxiv', () => 'arXiv')
                    .with('authorea', () => 'Authorea')
                    .with('biorxiv', () => 'bioRxiv')
                    .with('chemrxiv', () => 'ChemRxiv')
                    .with('eartharxiv', () => 'EarthArXiv')
                    .with('ecoevorxiv', () => 'EcoEvoRxiv')
                    .with('edarxiv', () => 'EdArXiv')
                    .with('engrxiv', () => 'engrXiv')
                    .with('medrxiv', () => 'medRxiv')
                    .with('metaarxiv', () => 'MetaArXiv')
                    .with('osf', () => 'OSF')
                    .with('osf-preprints', () => 'OSF Preprints')
                    .with('philsci', () => 'PhilSci-Archive')
                    .with('preprints.org', () => 'Preprints.org')
                    .with('psyarxiv', () => 'PsyArXiv')
                    .with('research-square', () => 'Research Square')
                    .with('scielo', () => 'SciELO Preprints')
                    .with('science-open', () => 'ScienceOpen Preprints')
                    .with('socarxiv', () => 'SocArXiv')
                    .with('zenodo', () => 'Zenodo')
                    .exhaustive()}
                </dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2>Your details</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>Published name</dt>
                <dd>${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}</dd>
                <dd>
                  <a href="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}"
                    >Change <span class="visually-hidden">name</span></a
                  >
                </dd>
              </div>

              <div>
                <dt>Competing interests</dt>
                <dd>${getCompetingInterests(review)}</dd>
                <dd>
                  <a href="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
                    >Change <span class="visually-hidden">competing interests</span></a
                  >
                </dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2 id="review-label">Your review</h2>

              ${review.reviewType === 'freeform'
                ? html`
                    <a href="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}"
                      >Change <span class="visually-hidden">PREreview</span></a
                    >
                  `
                : ''}
            </div>

            <div
              aria-labelledby="review-label"
              role="region"
              ${review.reviewType === 'freeform' ? rawHtml('tabindex="0"') : ''}
            >
              ${review.reviewType === 'freeform'
                ? fixHeadingLevels(2, review.review)
                : html`
                    <dl class="summary-list">
                      <div>
                        <dt>Does the introduction explain the objective of the research presented in the preprint?</dt>
                        <dd>
                          ${match(review.introductionMatches)
                            .with('yes', () => 'Yes')
                            .with('partly', () => 'Partly')
                            .with('no', () => 'No')
                            .with('skip', () => 'I don’t know')
                            .exhaustive()}
                        </dd>
                        ${review.introductionMatches !== 'skip' && review.introductionMatchesDetails
                          ? html` <dd>${review.introductionMatchesDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewIntroductionMatchesMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden"
                              >if the introduction explains the objective of the research presented in the
                              preprint</span
                            ></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>Are the methods well-suited for this research?</dt>
                        <dd>
                          ${match(review.methodsAppropriate)
                            .with('inappropriate', () => 'Highly inappropriate')
                            .with('somewhat-inappropriate', () => 'Somewhat inappropriate')
                            .with('adequate', () => 'Neither appropriate nor inappropriate')
                            .with('mostly-appropriate', () => 'Somewhat appropriate')
                            .with('highly-appropriate', () => 'Highly appropriate')
                            .with('skip', () => 'I don’t know')
                            .exhaustive()}
                        </dd>
                        ${review.methodsAppropriate !== 'skip' && review.methodsAppropriateDetails
                          ? html` <dd>${review.methodsAppropriateDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewMethodsAppropriateMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden">if the methods are well-suited for this research</span></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>Are the conclusions supported by the data?</dt>
                        <dd>
                          ${match(review.resultsSupported)
                            .with('not-supported', () => 'Highly unsupported')
                            .with('partially-supported', () => 'Somewhat unsupported')
                            .with('neutral', () => 'Neither supported nor unsupported')
                            .with('well-supported', () => 'Somewhat supported')
                            .with('strongly-supported', () => 'Highly supported')
                            .with('skip', () => 'I don’t know')
                            .exhaustive()}
                        </dd>
                        ${review.resultsSupported !== 'skip' && review.resultsSupportedDetails
                          ? html` <dd>${review.resultsSupportedDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewResultsSupportedMatch.formatter, { id: preprint.id })}"
                            >Change <span class="visually-hidden">if the conclusions are supported by the data</span></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>
                          Are the data presentations, including visualizations, well-suited to represent the data?
                        </dt>
                        <dd>
                          ${match(review.dataPresentation)
                            .with('inappropriate-unclear', () => 'Highly inappropriate or unclear')
                            .with('somewhat-inappropriate-unclear', () => 'Somewhat inappropriate or unclear')
                            .with('neutral', () => 'Neither appropriate and clear nor inappropriate and unclear')
                            .with('mostly-appropriate-clear', () => 'Somewhat appropriate and clear')
                            .with('highly-appropriate-clear', () => 'Highly appropriate and clear')
                            .with('skip', () => 'I don’t know')
                            .exhaustive()}
                        </dd>
                        ${review.dataPresentation !== 'skip' && review.dataPresentationDetails
                          ? html` <dd>${review.dataPresentationDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewDataPresentationMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden"
                              >if the data presentations are well-suited to represent the data?</span
                            ></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>
                          How clearly do the authors discuss, explain, and interpret their findings and potential next
                          steps for the research?
                        </dt>
                        <dd>
                          ${match(review.findingsNextSteps)
                            .with('inadequately', () => 'Very unclearly')
                            .with('insufficiently', () => 'Somewhat unclearly')
                            .with('adequately', () => 'Neither clearly nor unclearly')
                            .with('clearly-insightfully', () => 'Somewhat clearly')
                            .with('exceptionally', () => 'Very clearly')
                            .with('skip', () => 'I don’t know')
                            .exhaustive()}
                        </dd>
                        ${review.findingsNextSteps !== 'skip' && review.findingsNextStepsDetails
                          ? html` <dd>${review.findingsNextStepsDetails}</dd>`
                          : ''}
                        <dd>
                          <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden"
                              >how clearly the authors discuss their findings and next steps</span
                            ></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>Is the preprint likely to advance academic knowledge?</dt>
                        <dd>
                          ${match(review.novel)
                            .with('no', () => 'Not at all likely')
                            .with('limited', () => 'Not likely')
                            .with('some', () => 'Moderately likely')
                            .with('substantial', () => 'Somewhat likely')
                            .with('highly', () => 'Highly likely')
                            .with('skip', () => 'I don’t know')
                            .exhaustive()}
                        </dd>
                        ${review.novel !== 'skip' && review.novelDetails ? html` <dd>${review.novelDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden"
                              >if the preprint is likely to advance academic knowledge</span
                            ></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>Would it benefit from language editing?</dt>
                        <dd>
                          ${match(review.languageEditing)
                            .with('no', () => 'No')
                            .with('yes', () => 'Yes')
                            .exhaustive()}
                        </dd>
                        ${review.languageEditingDetails ? html` <dd>${review.languageEditingDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}"
                            >Change <span class="visually-hidden">if it would benefit from language editing</span></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>Would you recommend this preprint to others?</dt>
                        <dd>
                          ${match(review.shouldRead)
                            .with('no', () => 'No, it’s of low quality or is majorly flawed')
                            .with('yes-but', () => 'Yes, but it needs to be improved')
                            .with('yes', () => 'Yes, it’s of high quality')
                            .exhaustive()}
                        </dd>
                        ${review.shouldReadDetails ? html` <dd>${review.shouldReadDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewShouldReadMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden">if you would recommend this preprint to others</span></a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt>Is it ready for attention from an editor, publisher or broader audience?</dt>
                        <dd>
                          ${match(review.readyFullReview)
                            .with('no', () => 'No, it needs a major revision')
                            .with('yes-changes', () => 'Yes, after minor changes')
                            .with('yes', () => 'Yes, as it is')
                            .exhaustive()}
                        </dd>
                        ${review.readyFullReviewDetails ? html` <dd>${review.readyFullReviewDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewReadyFullReviewMatch.formatter, { id: preprint.id })}"
                            >Change
                            <span class="visually-hidden"
                              >it it is ready for attention from an editor, publisher or broader audience</span
                            ></a
                          >
                        </dd>
                      </div>
                    </dl>
                  `}
            </div>
          </div>

          <h2>Now publish your PREreview</h2>

          <p>
            We will assign your PREreview a DOI (a permanent identifier) and make it publicly available under a
            <a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0 license</a>.
          </p>

          <button>Publish PREreview</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    js: ['single-use-form.js', 'error-summary.js', 'notification-banner.js'],
  })
}
export const FlashMessageD = D.literal('contact-email-verified')
export function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
}
export const getCompetingInterests = (form: CompletedForm) =>
  match(form)
    .with({ competingInterests: 'yes' }, form => form.competingInterestsDetails)
    .with(
      { competingInterests: 'no', moreAuthors: P.union('yes', 'yes-private') },
      () => 'The authors declare that they have no competing interests.',
    )
    .with(
      { competingInterests: 'no', moreAuthors: 'no' },
      () => 'The author declares that they have no competing interests.',
    )
    .exhaustive()
