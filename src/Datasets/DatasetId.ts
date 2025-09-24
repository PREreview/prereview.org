import { Url } from '@effect/platform'
import { flow, Match, Option, pipe, Predicate, Schema, Tuple } from 'effect'
import { Doi } from '../types/index.js'

export type DatasetId = typeof DatasetId.Type

export class DryadDatasetId extends Schema.TaggedClass<DryadDatasetId>()('DryadDatasetId', {
  value: Doi.RegistrantDoiSchema('5061'),
}) {}

export const DatasetId = Schema.Union(DryadDatasetId)

const DatasetDoiSchema = DryadDatasetId.fields.value

export const DatasetIdFromDoi = Schema.transform(DatasetDoiSchema, Schema.typeSchema(DatasetId), {
  strict: true,
  decode: doi => new DryadDatasetId({ value: doi }),
  encode: datasetId => datasetId.value,
})

export const DatasetIdFromString = Schema.transform(
  Schema.TemplateLiteralParser('doi:', DatasetIdFromDoi),
  Schema.typeSchema(DatasetId),
  {
    strict: true,
    decode: Tuple.getSecond,
    encode: id => Tuple.make('doi:' as const, id),
  },
)

export const isDatasetDoi: Predicate.Refinement<Doi.Doi, DatasetId['value']> = Schema.is(DatasetDoiSchema)

export const parseDatasetDoi: (input: string) => Option.Option<DatasetId> = Schema.decodeOption(DatasetIdFromDoi)

export const fromUrl = (url: URL): Option.Option<DatasetId> =>
  pipe(
    Match.value(Url.mutate(url, url => (url.hostname = url.hostname.replace('www.', '')))),
    Match.when(
      url => ['doi.org', 'dx.doi.org'].includes(url.hostname),
      url => extractFromDoiPath(url.pathname.slice(1)),
    ),
    Match.when(
      url => url.hostname === 'datadryad.org',
      url => extractFromDryadPath(url.pathname.slice(1)),
    ),
    Match.orElse(Option.none<DatasetId>),
  )

export const parseDatasetIdInput = pipe(
  Match.type<Doi.Doi | URL>(),
  Match.withReturnType<Option.Option<DatasetId>>(),
  Match.when(Match.string, parseDatasetDoi),
  Match.when({ href: Match.string }, fromUrl),
  Match.exhaustive,
)

const extractFromDoiPath = flow(decodeURIComponent, parseDatasetDoi)

const extractFromDryadPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^dataset\/doi:(.+?)\/?$/i.exec(s)?.[1]),
  Option.filter(Predicate.compose(Doi.isDoi, Doi.hasRegistrant('5061'))),
  Option.andThen(doi => new DryadDatasetId({ value: doi })),
)
