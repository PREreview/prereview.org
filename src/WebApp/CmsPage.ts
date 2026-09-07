import { Effect } from 'effect'
import { CmsContent, type PageId } from '../CmsContent/index.ts'
import { Locale } from '../Context.ts'
import { fixHeadingLevels, html, plainText } from '../html.ts'
import { languageAttributesFor } from '../Locales.ts'
import { translate } from '../locales/index.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { PageResponse } from './Response/index.ts'

export const CmsPage = Effect.fnUntraced(
  function* ({
    pageId,
    canonical,
    current,
  }: {
    pageId: PageId
    canonical?: string
    current?: PageResponse['current']
  }) {
    const cmsContent = yield* CmsContent
    const locale = yield* Locale
    const t = translate(locale)

    const content = yield* cmsContent.getPage(pageId)

    const title = {
      AboutUs: t('about-us', 'title'),
      ChampionsProgram: t('champions-program', 'title'),
      Clubs: t('clubs', 'clubs'),
      CodeOfConduct: t('code-of-conduct', 'codeOfConduct'),
      EdiaStatement: t('edia-statement', 'ediaStatement'),
      Funding: t('funding', 'howWeFunded'),
      HowToUse: t('how-to-use', 'howToUse'),
      LiveReviews: t('live-reviews', 'liveReviews'),
      People: t('people', 'people'),
      PrivacyPolicy: t('privacy-policy', 'privacyPolicy'),
      Resources: t('resources', 'resources'),
      Trainings: t('trainings', 'trainings'),
    }[pageId]()

    return PageResponse({
      title: plainText(title),
      main: html`
        <h1>${title}</h1>

        ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}
        <div ${languageAttributesFor(content.locale)}>${fixHeadingLevels(1, content.html)}</div>
      `,
      canonical,
      current,
    })
  },
  Effect.catchAll(() => HavingProblemsPage),
)
