import { flow, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type { Orcid } from 'orcid-id-ts'
import rtlDetect from 'rtl-detect'
import { match, P } from 'ts-pattern'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import {
  profileMatch,
  writeReviewAddAuthorsMatch,
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
  writeReviewUseOfAiMatch,
} from '../../routes.js'
import { ProfileId } from '../../types/index.js'
import { isPseudonym } from '../../types/pseudonym.js'
import type { User } from '../../user.js'
import type { CompletedForm } from '../completed-form.js'
import { backNav } from '../shared-elements.js'

export function publishForm(preprint: PreprintTitle, review: CompletedForm, user: User, locale: SupportedLocale) {
  const t = translate(locale, 'write-review')

  const visuallyHidden: { visuallyHidden: (x: string) => string } = {
    visuallyHidden: s => `<span class="visually-hidden">${s}</span>`,
  }

  return StreamlinePageResponse({
    title: plainText(t('publishTitle')({ preprintTitle: preprint.title.toString() })),
    nav: backNav(locale, format(writeReviewConductMatch.formatter, { id: preprint.id })),
    main: html`
      <single-use-form>
        <form method="post" action="${format(writeReviewPublishMatch.formatter, { id: preprint.id })}" novalidate>
          <h1>${t('checkPrereview')()}</h1>

          <div class="summary-card">
            <div>
              <h2>${t('preprintDetails')()}</h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt><span>${t('preprintTitle')()}</span></dt>
                <dd>
                  <cite lang="${preprint.language}" dir="${rtlDetect.getLangDir(preprint.language)}"
                    >${preprint.title}</cite
                  >
                </dd>
              </div>
              <div>
                <dt><span>${t('preprintServer')()}</span></dt>
                <dd>
                  ${match(preprint.id.type)
                    .with('advance', () => 'Advance')
                    .with('africarxiv', () => 'AfricArXiv Preprints')
                    .with('arcadia-science', () => 'Arcadia Science')
                    .with('arxiv', () => 'arXiv')
                    .with('authorea', () => 'Authorea')
                    .with('biorxiv', () => 'bioRxiv')
                    .with('chemrxiv', () => 'ChemRxiv')
                    .with('curvenote', () => 'Curvenote')
                    .with('eartharxiv', () => 'EarthArXiv')
                    .with('ecoevorxiv', () => 'EcoEvoRxiv')
                    .with('edarxiv', () => 'EdArXiv')
                    .with('engrxiv', () => 'engrXiv')
                    .with('jxiv', () => 'Jxiv')
                    .with('medrxiv', () => 'medRxiv')
                    .with('metaarxiv', () => 'MetaArXiv')
                    .with('osf', () => 'OSF')
                    .with('osf-preprints', () => 'OSF Preprints')
                    .with('philsci', () => 'PhilSci-Archive')
                    .with('preprints.org', () => 'Preprints.org')
                    .with('psyarxiv', () => 'PsyArXiv')
                    .with('psycharchives', () => 'PsychArchives')
                    .with('research-square', () => 'Research Square')
                    .with('scielo', () => 'SciELO Preprints')
                    .with('science-open', () => 'ScienceOpen Preprints')
                    .with('socarxiv', () => 'SocArXiv')
                    .with('techrxiv', () => 'TechRxiv')
                    .with('verixiv', () => 'VeriXiv')
                    .with('zenodo', () => 'Zenodo')
                    .exhaustive()}
                </dd>
              </div>
            </dl>
          </div>

          <div class="summary-card">
            <div>
              <h2>
                ${match(review.moreAuthors)
                  .with('yes', t('authorDetails'))
                  .with('no', 'yes-private', t('yourDetails'))
                  .exhaustive()}
              </h2>
            </div>

            <dl class="summary-list">
              <div>
                <dt>
                  <span
                    >${match(review.moreAuthors)
                      .with('yes', t('yourPublishedName'))
                      .with('no', 'yes-private', t('publishedName'))
                      .exhaustive()}</span
                  >
                </dt>
                <dd>${displayAuthor(review.persona === 'public' ? user : { name: user.pseudonym })}</dd>
                <dd>
                  <a href="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}"
                    >${rawHtml(t('changeName')(visuallyHidden))}</a
                  >
                </dd>
              </div>

              ${review.moreAuthors === 'yes' && RA.isNonEmpty(review.otherAuthors)
                ? html`
                    <div>
                      <dt><span>${t('invitedAuthors')({ number: review.otherAuthors.length })}</span></dt>
                      <dd>${pipe(review.otherAuthors, RNEA.map(Struct.get('name')), formatList(locale))}</dd>
                      <dd>
                        <a href="${format(writeReviewAddAuthorsMatch.formatter, { id: preprint.id })}"
                          >${rawHtml(t('changeInvitedAuthors')(visuallyHidden))}</a
                        >
                      </dd>
                    </div>
                  `
                : ''}
              ${typeof review.generativeAiIdeas === 'string'
                ? html`
                    <div>
                      <dt><span>${t('useOfAiShort')()}</span></dt>
                      <dd>
                        ${match([review.generativeAiIdeas, review.moreAuthors])
                          .with(['yes', P.union('yes', 'yes-private')], () => t('aiIdeasAuthorsStatement')())
                          .with(['yes', 'no'], () => t('aiIdeasStatement')())
                          .with(['no', P.string], () => t('aiNotUsed')())
                          .exhaustive()}
                      </dd>
                      <dd>
                        <a href="${format(writeReviewUseOfAiMatch.formatter, { id: preprint.id })}"
                          >${rawHtml(t('changeUseOfAi')(visuallyHidden))}</a
                        >
                      </dd>
                    </div>
                  `
                : ''}

              <div>
                <dt><span>Competing interests</span></dt>
                <dd>${getCompetingInterests(review)}</dd>
                <dd>
                  <a href="${format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })}"
                    >${rawHtml(t('changeCompetingInterests')(visuallyHidden))}</a
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
                      >${rawHtml(t('changePrereview')(visuallyHidden))}</a
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
                        <dt><span>${t('doesIntroductionExplain')()}</span></dt>
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
                            >${rawHtml(t('changeIfIntroExplains')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('methodsWellSuited')()}</span></dt>
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
                            >${rawHtml(t('changeMethodsWellSuited')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('conclusionsSupported')()}</span></dt>
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
                            >${rawHtml(t('changeConclusionsSupported')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('dataPresentationWellSuited')()}</span></dt>
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
                            >${rawHtml(t('changeDataPresentationWellSuited')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('clearDiscussion')()}</span></dt>
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
                            >${rawHtml(t('changeClearDiscussion')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('advanceKnowledge')()}</span></dt>
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
                            >${rawHtml(t('changeAdvanceKnowledge')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('benefitFromEditing')()}</span></dt>
                        <dd>
                          ${match(review.languageEditing)
                            .with('no', () => 'No')
                            .with('yes', () => 'Yes')
                            .exhaustive()}
                        </dd>
                        ${review.languageEditingDetails ? html` <dd>${review.languageEditingDetails}</dd>` : ''}
                        <dd>
                          <a href="${format(writeReviewLanguageEditingMatch.formatter, { id: preprint.id })}"
                            >${rawHtml(t('changeBenefitFromEditing')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('wouldRecommend')()}</span></dt>
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
                            >${rawHtml(t('changeWouldRecommend')(visuallyHidden))}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt><span>${t('readyForAttention')()}</span></dt>
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
                            >${rawHtml(t('changeReadyForAttention')(visuallyHidden))}</a
                          >
                        </dd>
                      </div>
                    </dl>
                  `}
            </div>
          </div>

          <h2>${t('nowPublish')()}</h2>

          <p>
            ${rawHtml(
              t('weWillAssignLicense')({
                licenseLink: '<a href="https://creativecommons.org/licenses/by/4.0/">CC&nbsp;BY&nbsp;4.0</a>',
              }),
            )}
          </p>

          <button>${t('publishButton')()}</button>
        </form>
      </single-use-form>
    `,
    skipToLabel: 'form',
    js: ['single-use-form.js', 'error-summary.js', 'notification-banner.js'],
  })
}

export function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
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
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
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
