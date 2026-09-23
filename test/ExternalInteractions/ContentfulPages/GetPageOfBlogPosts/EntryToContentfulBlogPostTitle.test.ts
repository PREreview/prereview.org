import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import resolveResponse from 'contentful-resolve-response'
import { Array, Effect, Layer, pipe, Schema, Struct } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import { Entries } from '../../../../src/ExternalApis/Contentful/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ContentfulPages/GetPageOfBlogPosts/EntryToContentfulBlogPostTitle.ts'
import { ContentfulBlogPostTitle } from '../../../../src/ExternalInteractions/ContentfulPages/index.ts'
import { html } from '../../../../src/html.ts'
import { DefaultLocale } from '../../../../src/locales/index.ts'
import { Slug } from '../../../../src/types/Slug.ts'

it.effect.each<{
  response: string
  index: number
  expected: ContentfulBlogPostTitle
}>([
  {
    response: 'blog-posts-multiple-authors',
    index: 0,
    expected: new ContentfulBlogPostTitle({
      title: html`PREreview platform news, 31 October 2025`,
      locale: DefaultLocale,
      slug: Slug('prereview-platform-news-31-october-2025'),
    }),
  },
  {
    response: 'blog-posts-newsletter',
    index: 0,
    expected: new ContentfulBlogPostTitle({
      title: html`PREreview August 2026 Newsletter`,
      locale: DefaultLocale,
      slug: Slug('august-newsletter'),
    }),
  },
  {
    response: 'blog-posts-interview',
    index: 0,
    expected: new ContentfulBlogPostTitle({
      title: html`An interview with PREreview Champion Mabel Omoniwa`,
      locale: DefaultLocale,
      slug: Slug('interview-prereview-champion-mabel-omoniwa'),
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
      Effect.andThen(_.EntryToContentfulBlogPostTitle),
    )

    expect(actual).toStrictEqual(expected)
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
      Effect.andThen(Array.map(item => _.EntryToContentfulBlogPostTitle(item))),
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
