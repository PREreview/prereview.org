import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import { assertEquals } from '@effect/vitest/utils'
import resolveResponse from 'contentful-resolve-response'
import { Array, Effect, Layer, pipe, Schema, Struct } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import { Entries } from '../../../../src/ExternalApis/Contentful/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ContentfulPages/GetBlogPost/EntryToContentfulBlogPost.ts'
import { Author, ContentfulBlogPost } from '../../../../src/ExternalInteractions/ContentfulPages/index.ts'
import { html } from '../../../../src/html.ts'
import { DefaultLocale } from '../../../../src/locales/index.ts'
import { Name } from '../../../../src/types/Name.ts'
import { Instant } from '../../../../src/types/Temporal.ts'

it.effect.each<{
  response: string
  index: number
  expected: ContentfulBlogPost
}>([
  {
    response: 'blog-posts-multiple-authors',
    index: 0,
    expected: new ContentfulBlogPost({
      title: html`PREreview platform news, 31 October 2025`,
      authors: [new Author({ name: Name('Chad Sansing') }), new Author({ name: Name('Chris Wilkinson') })],
      publishedAt: Instant.from('2026-09-11T11:00:46.542Z'),
      html: html`
        <p>
          <span>Thanks for checking out the latest update from the product team at <a href="/">PREreview.org</a>.</span>
        </p>
        <h1><span>What’s new at PREreview?</span></h1>
        <p>
          <span
            >We’re continuing to improve
            <a href="https://content.prereview.org/now-you-can-review-datasets-on-prereview-org/"
              >our new dataset review workflow</a
            >
            this week. Soon, we’ll display dataset reviews alongside preprint reviews on our webpage and community
            Slack. We’ve also added support for more registrant DOIs from Dryad to allow for the review of older
            datasets. We’ll automate the process for adding multiple authors shortly, as well.</span
          >
        </p>
        <h1><span>What’s next?</span></h1>
        <p>
          <span
            >Up next we’ll add our-use-of-AI declaration step to the dataset review workflow. Next month, we’re
            prototyping more individualized matchmaking between community members and reviews and requests that might
            interest them. We’re also prepping for our next all-hands retreat in November.</span
          >
        </p>
      `,
      locale: DefaultLocale,
    }),
  },
])('can parse a record ($response $index)', ({ response, index, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
      Effect.map(ResolveEntries),
      Effect.andThen(Schema.decodeUnknown(Entries)),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.get(index)),
      Effect.andThen(_.EntryToContentfulBlogPost),
    )

    expect(Struct.omit(actual, 'html')).toStrictEqual(Struct.omit(expected, 'html'))
    assertEquals(actual.html, expected.html)
  }).pipe(Effect.provide([Layer.succeed(Locale, DefaultLocale), NodeFileSystem.layer])),
)

it.effect.each([
  [
    'banners',
    'pages-assets',
    'pages-cta-dynamic-embed',
    'pages-marks',
    'pages-media-profile-images',
    'pages-unordered-list-table',
  ],
])("can't parse a record (%s)", ([response]) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
      Effect.map(ResolveEntries),
      Effect.andThen(Schema.decodeUnknown(Entries)),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.map(item => _.EntryToContentfulBlogPost(item))),
      Effect.andThen(Effect.allWith({ concurrency: 'unbounded', mode: 'either' })),
    )

    actual.forEach(result => {
      expect(result).toMatchObject({ _tag: 'Left' })
    })
  }).pipe(Effect.provide([Layer.succeed(Locale, DefaultLocale), NodeFileSystem.layer])),
)

const ResolveEntries = (response: string) => {
  const body = JSON.parse(response)

  return { ...body, items: resolveResponse(body) }
}
