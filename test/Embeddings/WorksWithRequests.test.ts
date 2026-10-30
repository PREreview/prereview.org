import { Effect } from 'effect'
import type { SqlClient } from '@effect/sql'
import { describe, expect, it } from 'vitest'
import { findExistingWorks, storeEmbeddings } from '../../src/Embeddings/WorksWithRequests.ts'
import type { Embedding } from '../../src/Embeddings/Shared.ts'
import type { LanguageCode } from 'iso-639-1'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import {
  BiorxivOrMedrxivPreprintId,
  type IndeterminatePreprintId,
  PhilsciPreprintId,
} from '../../src/Preprints/index.ts'

const biorxiv = (doi: `10.1101/${string}`) => new BiorxivOrMedrxivPreprintId({ value: Doi(doi) })

const makeFakeSql = (rows: ReadonlyArray<Record<string, unknown>> = []) => {
  const queries: Array<{ sql: string; params: ReadonlyArray<unknown> }> = []

  const render = (value: unknown): string => {
    if (value !== null && typeof value === 'object' && '__text' in value) {
      return (value as { __text: string }).__text
    }
    if (Array.isArray(value)) return `[${value.map(render).join(', ')}]`
    return String(value)
  }

  const statement = (strings: TemplateStringsArray, ...args: Array<unknown>) => {
    const text = strings
      .reduce((acc, part, i) => acc + part + (i < args.length ? render(args[i]) : ''), '')
      .replaceAll(/\s+/g, ' ')
      .replaceAll('( ', '(')
      .replaceAll(' )', ')')
      .trim()
    queries.push({ sql: text, params: args })
    return Object.assign(Effect.succeed(rows), { __text: text })
  }

  const sql = Object.assign(statement as unknown as SqlClient.SqlClient, {
    in: (column: string, values: ReadonlyArray<unknown>) => ({
      __text: `${column} IN (${values.map(render).join(', ')})`,
    }),
    join:
      (separator: string, addParens = true) =>
      (clauses: ReadonlyArray<unknown>) => {
        const joined = clauses.map(render).join(separator)
        return { __text: addParens ? `(${joined})` : joined }
      },
  })

  return { sql, queries }
}

describe('findExistingWorks', () => {
  it('returns the preprint IDs already present in one batched query', async () => {
    const { sql, queries } = makeFakeSql([
      { preprint_id: 'doi:10.1101/already' },
      { preprint_id: 'doi:10.1101/stored' },
      { preprint_id: 'https://philsci-archive.pitt.edu/123/' },
    ])

    const result = await Effect.runPromise(
      findExistingWorks(
        [
          biorxiv('10.1101/already'),
          biorxiv('10.1101/missing'),
          biorxiv('10.1101/Stored'),
          new PhilsciPreprintId({ value: 123 }),
        ],
        sql,
      ),
    )

    expect(result).toEqual(
      new Set([biorxiv('10.1101/already'), biorxiv('10.1101/stored'), new PhilsciPreprintId({ value: 123 })]),
    )
    expect(queries).toHaveLength(1)
    expect(queries[0]!.sql).toContain('SELECT preprint_id FROM request_embeddings')
    expect(queries[0]!.sql).toContain(
      'WHERE preprint_id IN (doi:10.1101/already, doi:10.1101/missing, doi:10.1101/stored, https://philsci-archive.pitt.edu/123/)',
    )
  })

  it('returns an empty set without querying when given no preprint IDs', async () => {
    const { sql, queries } = makeFakeSql()

    const result = await Effect.runPromise(findExistingWorks([], sql))

    expect(result.size).toBe(0)
    expect(queries).toHaveLength(0)
  })
})

describe('storeEmbeddings', () => {
  interface EmbeddingRow {
    preprintId: IndeterminatePreprintId
    language: LanguageCode
    authors: ReadonlyArray<OrcidId>
    embedding: Embedding
  }

  const row = (
    preprintId: IndeterminatePreprintId,
    language: LanguageCode = 'en',
    authors: ReadonlyArray<OrcidId> = [OrcidId('0000-0002-1825-0097')],
  ): EmbeddingRow => ({
    preprintId,
    language,
    authors,
    embedding: new Float32Array([1, 2, 3]),
  })

  it('inserts all rows in one multi-row statement with lowercased preprint IDs', async () => {
    const { sql, queries } = makeFakeSql()

    await Effect.runPromise(
      storeEmbeddings([row(biorxiv('10.1101/A')), row(new PhilsciPreprintId({ value: 123 }))], sql),
    )

    const insert = queries.at(-1)!
    expect(insert.sql).toContain('INSERT INTO request_embeddings (preprint_id, language, authors, embedding)')
    expect(insert.sql).toContain('(doi:10.1101/a, en, [0000-0002-1825-0097], [1,2,3]::halfvec)')
    expect(insert.sql).toContain('(https://philsci-archive.pitt.edu/123/, en, [0000-0002-1825-0097], [1,2,3]::halfvec)')
    expect(insert.sql).toContain('ON CONFLICT (preprint_id) DO NOTHING')
  })

  it('does nothing for an empty list', async () => {
    const { sql, queries } = makeFakeSql()

    await Effect.runPromise(storeEmbeddings([], sql))

    expect(queries).toHaveLength(0)
  })
})
