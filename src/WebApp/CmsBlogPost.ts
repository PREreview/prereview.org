import { Array, Effect, flow, pipe } from 'effect'
import { CmsContent } from '../CmsContent/index.ts'
import { Locale } from '../Context.ts'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../html.ts'
import { languageAttributesFor } from '../Locales.ts'
import { translate } from '../locales/index.ts'
import * as Routes from '../routes.ts'
import { renderDate } from '../time.ts'
import type { Name } from '../types/Name.ts'
import type { Slug } from '../types/Slug.ts'
import { HavingProblemsPage } from './HavingProblemsPage/index.ts'
import { PageResponse } from './Response/index.ts'

export const CmsBlogPostPage = Effect.fnUntraced(
  function* ({ slug, preview = false }: { slug: Slug; preview?: boolean }) {
    const cmsContent = yield* CmsContent
    const locale = yield* Locale
    const t = translate(locale)

    const content = yield* cmsContent.getBlogPost(slug, preview)

    return PageResponse({
      title: plainText(content.title),
      description: typeof content.excerpt === 'string' ? plainText(content.excerpt) : undefined,
      image: content.heroImage
        ? {
            url: content.heroImage.url.default,
            width: content.heroImage.width,
            height: content.heroImage.height,
          }
        : undefined,
      nav: html`<a href="${Routes.Blog.href({ page: 1 })}" class="back">${t('forms', 'backLink')()}</a>`,
      main: html`
        <header>
          ${
            content.heroImage?.caption
              ? html`
                  <figure>
                    <picture>
                      <source srcset="${content.heroImage.url.avif.href}" type="image/avif" />
                      <source srcset="${content.heroImage.url.webp.href}" type="image/webp" />
                      <img
                        src="${content.heroImage.url.default.href}"
                        width="${content.heroImage.width}"
                        height="${content.heroImage.height}"
                        alt="${content.heroImage.altText ?? ''}"
                      />
                    </picture>
                    <figcaption>${content.heroImage.caption}</figcaption>
                  </figure>
                `
              : content.heroImage
                ? html`
                    <picture>
                      <source srcset="${content.heroImage.url.avif.href}" type="image/avif" />
                      <source srcset="${content.heroImage.url.webp.href}" type="image/webp" />
                      <img
                        src="${content.heroImage.url.default.href}"
                        width="${content.heroImage.width}"
                        height="${content.heroImage.height}"
                        alt="${content.heroImage.altText ?? ''}"
                      />
                    </picture>
                  `
                : ''
          }

          <h1><span ${languageAttributesFor(content.locale)}>${content.title}</span></h1>

          <div class="byline">
            <span ${languageAttributesFor('en')}
              ><span class="visually-hidden">Authored</span> by
              ${pipe(content.authors, Array.map(displayAuthor), formatList(locale))}</span
            >
          </div>

          <dl>
            <div>
              <dt><span ${languageAttributesFor('en')}>Published</span></dt>
              <dd>${renderDate(locale)(content.publishedAt.toZonedDateTimeISO('UTC').toPlainDate())}</dd>
            </div>
          </dl>
        </header>

        ${content.locale !== locale ? html`<div class="inset"><p>${t('header', 'onlyEnglish')()}</p></div>` : ''}

        <div ${languageAttributesFor(content.locale)}>${fixHeadingLevels(1, content.html)}</div>
      `,
      canonical: Routes.BlogPost.href({ slug }),
      js: ['youtube-embed.js'],
    })
  },
  Effect.catchAll(() => HavingProblemsPage),
)

function displayAuthor({ name }: { name: Name }) {
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
