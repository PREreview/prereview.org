import { defineCE, expect, fixture, waitUntil } from '@open-wc/testing'
import * as _ from '../../assets/html-editor.js'

describe('while it loads', () => {
  it('shows a loading message', async () => {
    const element = defineCE(class extends _.HtmlEditor {})
    await fixture<HTMLFormElement>('<form id="form"/>')
    const htmlEditor = await fixture<_.HtmlEditor>(
      `<${element}>
        <textarea form="form"/>
      </${element}>`,
    )

    expect(htmlEditor.firstElementChild).to.have.attribute('aria-busy', 'true')
    expect(htmlEditor.querySelector('textarea')).to.be.have.attribute('readonly')
    expect(htmlEditor.querySelector('.loading')).to.be.have.text('Loading')

    await waitUntil(() => !htmlEditor.querySelector('.loading'), undefined, { timeout: 2000 })

    expect(htmlEditor.firstElementChild).to.have.attribute('aria-busy', 'false')
    expect(htmlEditor.querySelector('textarea')).to.be.have.attribute('readonly')
    expect(htmlEditor.querySelector('textarea')).to.be.have.attribute('hidden')
  })
})
