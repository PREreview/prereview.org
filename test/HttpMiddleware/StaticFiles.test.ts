import { describe, expect, it } from '../vitest.ts'
import * as _ from '../../src/HttpMiddleware/StaticFiles.ts'

describe('hasContentHash', () => {
  it.each([
    ['/dist/assets/bold.DbcBlABl.svg'],
    ['/dist/assets/conditional-inputs.BMWJWLWp.js'],
    ['/dist/assets/conditional-inputs.BMWJWLWp.js.map'],
    ['/dist/assets/arrow-up-s-line.B_7gQYmh.svg'],
    ['/dist/assets/dist.ChdiK6s-.js'],
    ['/dist/assets/dist.ChdiK6s-.js.map'],
    ['/dist/assets/html-editor.CEkx_40-.js'],
    ['/dist/assets/IBMPlexSans-Bold-Latin2.DOLj-U8V.woff2'],
  ])('%s has a content hash', filePath => {
    expect(_.hasContentHash(filePath)).toBe(true)
  })

  it.each([
    ['/dist/assets/favicon.ico'],
    ['/dist/assets/robots.txt'],
    ['/dist/assets/africarxiv.svg.map'],
    ['/dist/assets/bold.DbcBlAB.svg'],
    ['/dist/assets/bold.DbcB^lAB.svg'],
    ['/dist/assets/bold.DbcBlABl.svg.br'],
  ])('%s has no content hash', filePath => {
    expect(_.hasContentHash(filePath)).toBe(false)
  })
})
