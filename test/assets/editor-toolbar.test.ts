import { defineCE, expect, fixture } from '@open-wc/testing'
import { sendKeys } from '@web/test-runner-commands'
import * as _ from '../../assets/editor-toolbar.js'

describe('when it loads', () => {
  it('is a toolbar', async () => {
    const element = defineCE(class extends _.EditorToolbar {})
    const editorToolbar = await fixture<_.EditorToolbar>(
      `<${element}>
        <button type="button">
      </${element}>`,
    )

    expect(editorToolbar).to.have.attribute('role', 'toolbar')
  })

  it('the first button gets focus', async () => {
    const element = defineCE(class extends _.EditorToolbar {})
    await fixture<_.EditorToolbar>(
      `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
        <button type="button" id="button3">
      </${element}>`,
    )

    expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
    expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
    expect(document.getElementById('button3')).to.have.attribute('tabindex', '-1')
  })
})

it('does nothing if there are no buttons', async () => {
  const element = defineCE(class extends _.EditorToolbar {})
  await fixture<_.EditorToolbar>(`<${element}></${element}>`)

  expect(document.querySelectorAll('[tabindex]')).to.be.empty
})

describe('when a button is clicked', () => {
  it('gets focus', async () => {
    const element = defineCE(class extends _.EditorToolbar {})
    await fixture<_.EditorToolbar>(
      `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
    )

    document.getElementById('button2')?.click()

    expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
    expect(document.getElementById('button2')).to.have.attribute('tabindex', '0')
    expect(document.getElementById('button2')).to.have.focus
  })
})

describe('when something inside a button is clicked', () => {
  it('gets focus', async () => {
    const element = defineCE(class extends _.EditorToolbar {})
    await fixture<_.EditorToolbar>(
      `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2"><img id="image1"></button>
      </${element}>`,
    )

    document.getElementById('image1')?.click()

    expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
    expect(document.getElementById('button2')).to.have.attribute('tabindex', '0')
    expect(document.getElementById('button2')).to.have.focus
  })
})

describe('on an ArrowLeft key', () => {
  describe('when there is another button', () => {
    it('the previous button gets focus', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'ArrowLeft' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button1')).to.have.focus
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
    })
  })

  describe('when on the first button', () => {
    it('does nothing', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowLeft' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button1')).to.have.focus
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
    })
  })
})

describe('on an ArrowRight key', () => {
  describe('when there is another button', () => {
    it('the next button gets focus', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
        <button type="button" id="button3">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button2')).to.have.focus
      expect(document.getElementById('button3')).to.have.attribute('tabindex', '-1')
    })
  })

  describe('when on the last button', () => {
    it('does nothing', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'ArrowRight' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button2')).to.have.focus
    })
  })
})

describe('on an ArrowUp key', () => {
  describe('when there is another button', () => {
    it('the first button gets focus', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
        <button type="button" id="button3">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'ArrowUp' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button1')).to.have.focus
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button3')).to.have.attribute('tabindex', '-1')
    })
  })

  describe('when on the first button', () => {
    it('does nothing', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowUp' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button1')).to.have.focus
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
    })
  })
})

describe('on a Home key', () => {
  describe('when there is another button', () => {
    it('the first button gets focus', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
        <button type="button" id="button3">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'Home' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button1')).to.have.focus
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button3')).to.have.attribute('tabindex', '-1')
    })
  })

  describe('when on the first button', () => {
    it('does nothing', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'Home' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button1')).to.have.focus
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
    })
  })
})

describe('on an ArrowDown key', () => {
  describe('when there is another button', () => {
    it('the last button gets focus', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
        <button type="button" id="button3">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowDown' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button3')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button3')).to.have.focus
    })
  })

  describe('when on the last button', () => {
    it('does nothing', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'ArrowDown' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button2')).to.have.focus
    })
  })
})

describe('on an End key', () => {
  describe('when there is another button', () => {
    it('the last button gets focus', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
        <button type="button" id="button3">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'End' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button3')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button3')).to.have.focus
    })
  })

  describe('when on the last button', () => {
    it('does nothing', async () => {
      const element = defineCE(class extends _.EditorToolbar {})
      await fixture<_.EditorToolbar>(
        `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
      )

      await sendKeys({ press: 'Tab' })
      await sendKeys({ press: 'ArrowRight' })
      await sendKeys({ press: 'End' })

      expect(document.getElementById('button1')).to.have.attribute('tabindex', '-1')
      expect(document.getElementById('button2')).to.have.attribute('tabindex', '0')
      expect(document.getElementById('button2')).to.have.focus
    })
  })
})

describe('on another key', () => {
  it('does nothing', async () => {
    const element = defineCE(class extends _.EditorToolbar {})
    await fixture<_.EditorToolbar>(
      `<${element}>
        <button type="button" id="button1">
        <button type="button" id="button2">
      </${element}>`,
    )

    await sendKeys({ press: 'Tab' })
    await sendKeys({ press: 'KeyA' })

    expect(document.getElementById('button1')).to.have.attribute('tabindex', '0')
    expect(document.getElementById('button1')).to.have.focus
    expect(document.getElementById('button2')).to.have.attribute('tabindex', '-1')
  })
})
