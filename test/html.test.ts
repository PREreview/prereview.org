import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as D from 'io-ts/Decoder'
import * as _ from '../src/html.js'
import * as fc from './fc.js'

test.each([
  ['html variable', _.html`${_.rawHtml('<p>a</p>')}`, '<p>a</p>'],
  ['plain text variable ', _.html`${_.plainText('a')}`, 'a'],
  ['array variable ', _.html`${[_.rawHtml('<p>a</p>'), _.rawHtml('<p>b</p>')]}`, '<p>a</p><p>b</p>'],
  ['string variable', _.html`${'<p>a</p>'}`, '&lt;p&gt;a&lt;/p&gt;'],
  ['number variable ', _.html`${1}`, '1'],
])('html (%s)', (_name, actual, expected) => {
  expect(actual.toString()).toBe(expected)
})

test.each([
  ['mismatched tags', '<b><i>bold italic</b> plain</i>', '<b><i>bold italic</i></b> plain'],
  ['comment', '<!-- comment -->', ''],
  ['<a>', '<a>a</a>', '<a>a</a>'],
  [
    '<a> with attributes',
    '<a href="http://example.com/" lang="en" dir="ltr" id="a" foo>a</a>',
    '<a href="http://example.com/" lang="en" dir="ltr">a</a>',
  ],
  ['<a> with a protocol-relative link', '<a href="//example.com/">a</a>', '<a>a</a>'],
  ['<a> with a HTTPS link', '<a href="https://example.com/">a</a>', '<a href="https://example.com/">a</a>'],
  ['<a> with an FTP link', '<a href="ftp://example.com/">a</a>', '<a href="ftp://example.com/">a</a>'],
  ['<a> with an email link', '<a href="mailto:hello@example.com">a</a>', '<a href="mailto:hello@example.com">a</a>'],
  ['<a> with a fragment link', '<a href="#foo">a</a>', '<a>a</a>'],
  ['<a> with a relative link', '<a href="/foo">a</a>', '<a>a</a>'],
  ['<a> with a javascript link', '<a href="javascript:alert(\'foo\')">a</a>', '<a>a</a>'],
  ['<abbr>', '<abbr>abbr</abbr>', 'abbr'],
  ['<abbr> with attributes', '<abbr lang="en" dir="ltr" id="abbr" foo>abbr</abbr>', 'abbr'],
  ['<acronym>', '<acronym>acronym</acronym>', 'acronym'],
  ['<acronym> with attributes', '<acronym lang="en" dir="ltr" id="acronym" foo>acronym</acronym>', 'acronym'],
  ['<address>', '<address>address</address>', 'address'],
  ['<address> with attributes', '<address lang="en" dir="ltr" id="address" foo>address</address>', 'address'],
  ['<applet>', '<applet>applet</applet>', 'applet'],
  ['<applet> with attributes', '<applet alt="applet" lang="en" dir="ltr" id="applet" foo>applet</applet>', 'applet'],
  ['<area>', '<area>', ''],
  ['<area> with attributes', '<area alt="area" lang="en" dir="ltr" id="area" foo>', ''],
  ['<area> with a body', '<area>area</area>', 'area'],
  ['<article>', '<article>article</article>', 'article'],
  ['<article> with attributes', '<article lang="en" dir="ltr" id="article" foo>article</article>', 'article'],
  ['<aside>', '<aside>aside</aside>', 'aside'],
  ['<aside> with attributes', '<aside lang="en" dir="ltr" id="aside" foo>aside</aside>', 'aside'],
  ['<audio>', '<audio>audio</audio>', 'audio'],
  ['<audio> with attributes', '<audio lang="en" dir="ltr" id="audio" foo>audio</audio>', 'audio'],
  ['<b>', '<b>b</b>', '<b>b</b>'],
  ['<b> with attributes', '<b lang="en" dir="ltr" id="b" foo>b</b>', '<b lang="en" dir="ltr">b</b>'],
  ['<base>', '<base>', ''],
  ['<base> with attributes', '<base lang="en" dir="ltr" id="base" foo>', ''],
  ['<base> with a body', '<base>base</base>', 'base'],
  ['<basefont>', '<basefont>basefont</basefont>', 'basefont'],
  ['<basefont> with attributes', '<basefont lang="en" dir="ltr" id="basefont" foo>basefont</basefont>', 'basefont'],
  ['<bdi>', '<bdi>bdi</bdi>', 'bdi'],
  ['<bdi> with attributes', '<bdi lang="en" dir="ltr" id="bdi" foo>bdi</bdi>', 'bdi'],
  ['<bdo>', '<bdo>bdo</bdo>', 'bdo'],
  ['<bdo> with attributes', '<bdo lang="en" dir="ltr" id="bdo" foo>bdo</bdo>', 'bdo'],
  ['<big>', '<big>big</big>', 'big'],
  ['<big> with attributes', '<big lang="en" dir="ltr" id="big" foo>big</big>', 'big'],
  ['<blockquote>', '<blockquote>blockquote</blockquote>', 'blockquote'],
  [
    '<blockquote> with attributes',
    '<blockquote lang="en" dir="ltr" id="blockquote" foo>blockquote</blockquote>',
    'blockquote',
  ],
  ['<body>', '<body>body</body>', 'body'],
  ['<body> with attributes', '<body lang="en" dir="ltr" id="body" foo>body</body>', 'body'],
  ['<br>', '<br>', ''],
  ['<br> with attributes', '<br lang="en" dir="ltr" id="br" foo>', ''],
  ['<br> with a body', '<br>br</br>', 'br'],
  ['<button>', '<button>button</button>', 'button'],
  ['<button> with attributes', '<button lang="en" dir="ltr" id="button" foo>button</button>', 'button'],
  ['<canvas>', '<canvas>canvas</canvas>', 'canvas'],
  ['<canvas> with attributes', '<canvas lang="en" dir="ltr" id="canvas" foo>canvas</canvas>', 'canvas'],
  ['<caption>', '<caption>caption</caption>', 'caption'],
  ['<caption> with attributes', '<caption lang="en" dir="ltr" id="caption" foo>caption</caption>', 'caption'],
  ['<center>', '<center>center</center>', 'center'],
  ['<center> with attributes', '<center lang="en" dir="ltr" id="center" foo>center</center>', 'center'],
  ['<cite>', '<cite>cite</cite>', 'cite'],
  ['<cite> with attributes', '<cite lang="en" dir="ltr" id="cite" foo>cite</cite>', 'cite'],
  ['<code>', '<code>code</code>', 'code'],
  ['<code> with attributes', '<code lang="en" dir="ltr" id="code" foo>code</code>', 'code'],
  ['<col>', '<col>', ''],
  ['<col> with attributes', '<col lang="en" dir="ltr" id="col" foo>', ''],
  ['<col> with a body', '<col>col</col>', 'col'],
  ['<colgroup>', '<colgroup>colgroup</colgroup>', 'colgroup'],
  ['<colgroup> with attributes', '<colgroup lang="en" dir="ltr" id="colgroup" foo>colgroup</colgroup>', 'colgroup'],
  ['<data>', '<data>data</data>', 'data'],
  ['<data> with attributes', '<data value="data" lang="en" dir="ltr" id="data" foo>data</data>', 'data'],
  ['<datalist>', '<datalist>datalist</datalist>', 'datalist'],
  ['<datalist> with attributes', '<datalist lang="en" dir="ltr" id="datalist" foo>datalist</datalist>', 'datalist'],
  ['<dd>', '<dd>dd</dd>', '<dd>dd</dd>'],
  ['<dd> with attributes', '<dd lang="en" dir="ltr" id="dd" foo>dd</dd>', '<dd lang="en" dir="ltr">dd</dd>'],
  ['<del>', '<del>del</del>', 'del'],
  ['<del> with attributes', '<del lang="en" dir="ltr" id="del" foo>del</del>', 'del'],
  ['<details>', '<details>details</details>', 'details'],
  ['<details> with attributes', '<details lang="en" dir="ltr" id="details" foo>details</details>', 'details'],
  ['<dfn>', '<dfn>dfn</dfn>', 'dfn'],
  ['<dfn> with attributes', '<dfn lang="en" dir="ltr" id="dfn" foo>dfn</dfn>', 'dfn'],
  ['<dialog>', '<dialog>dialog</dialog>', 'dialog'],
  ['<dialog> with attributes', '<dialog lang="en" dir="ltr" id="dialog" foo>dialog</dialog>', 'dialog'],
  ['<dir>', '<dir>dir</dir>', 'dir'],
  ['<dir> with attributes', '<dir lang="en" dir="ltr" id="dir" foo>dir</dir>', 'dir'],
  ['<div>', '<div>div</div>', 'div'],
  ['<div> with attributes', '<div lang="en" dir="ltr" id="div" foo>div</div>', 'div'],
  ['<dl>', '<dl>dl</dl>', '<dl>dl</dl>'],
  ['<dl> with attributes', '<dl lang="en" dir="ltr" id="dl" foo>dl</dl>', '<dl lang="en" dir="ltr">dl</dl>'],
  ['<dt>', '<dt>dt</dt>', '<dt>dt</dt>'],
  ['<dt> with attributes', '<dt lang="en" dir="ltr" id="dt" foo>dt</dt>', '<dt lang="en" dir="ltr">dt</dt>'],
  ['<em>', '<em>em</em>', '<i>em</i>'],
  ['<em> with attributes', '<em lang="en" dir="ltr" id="em" foo>em</em>', '<i lang="en" dir="ltr">em</i>'],
  ['<embed>', '<embed>', ''],
  ['<embed> with attributes', '<embed lang="en" dir="ltr" id="embed" foo>', ''],
  ['<embed> with a body', '<embed>embed</embed>', 'embed'],
  ['<fieldset>', '<fieldset>fieldset</fieldset>', 'fieldset'],
  ['<fieldset> with attributes', '<fieldset lang="en" dir="ltr" id="fieldset" foo>fieldset</fieldset>', 'fieldset'],
  ['<figcaption>', '<figcaption>figcaption</figcaption>', 'figcaption'],
  [
    '<figcaption> with attributes',
    '<figcaption lang="en" dir="ltr" id="figcaption" foo>figcaption</figcaption>',
    'figcaption',
  ],
  ['<figure>', '<figure>figure</figure>', 'figure'],
  ['<figure> with attributes', '<figure lang="en" dir="ltr" id="figure" foo>figure</figure>', 'figure'],
  ['<font>', '<font>font</font>', 'font'],
  ['<font> with attributes', '<font lang="en" dir="ltr" id="font" foo>font</font>', 'font'],
  ['<footer>', '<footer>footer</footer>', 'footer'],
  ['<footer> with attributes', '<footer lang="en" dir="ltr" id="footer" foo>footer</footer>', 'footer'],
  ['<form>', '<form>form</form>', 'form'],
  ['<form> with attributes', '<form lang="en" dir="ltr" id="form" foo>form</form>', 'form'],
  ['<frame>', '<frame>frame</frame>', 'frame'],
  ['<frame> with attributes', '<frame lang="en" dir="ltr" id="frame" foo>frame</frame>', 'frame'],
  ['<frameset>', '<frameset>frameset</frameset>', 'frameset'],
  ['<frameset> with attributes', '<frameset lang="en" dir="ltr" id="frameset" foo>frameset</frameset>', 'frameset'],
  ['<h1>', '<h1>h1</h1>', '<h1>h1</h1>'],
  ['<h1> with attributes', '<h1 lang="en" dir="ltr" id="h1" foo>h1</h1>', '<h1 lang="en" dir="ltr">h1</h1>'],
  ['<h1> with no text', '<h1> &nbsp;\n</h1>', ''],
  ['<h2>', '<h2>h2</h2>', '<h2>h2</h2>'],
  ['<h2> with attributes', '<h2 lang="en" dir="ltr" id="h2" foo>h2</h2>', '<h2 lang="en" dir="ltr">h2</h2>'],
  ['<h2> with no text', '<h2> &nbsp;\n</h2>', ''],
  ['<h3>', '<h3>h3</h3>', '<h3>h3</h3>'],
  ['<h3> with attributes', '<h3 lang="en" dir="ltr" id="h3" foo>h3</h3>', '<h3 lang="en" dir="ltr">h3</h3>'],
  ['<h3> with no text', '<h3> &nbsp;\n</h3>', ''],
  ['<h4>', '<h4>h4</h4>', '<h4>h4</h4>'],
  ['<h4> with attributes', '<h4 lang="en" dir="ltr" id="h4" foo>h4</h4>', '<h4 lang="en" dir="ltr">h4</h4>'],
  ['<h4> with no text', '<h4> &nbsp;\n</h4>', ''],
  ['<h5>', '<h5>h5</h5>', '<h5>h5</h5>'],
  ['<h5> with attributes', '<h5 lang="en" dir="ltr" id="h5" foo>h5</h5>', '<h5 lang="en" dir="ltr">h5</h5>'],
  ['<h5> with no text', '<h5> &nbsp;\n</h5>', ''],
  ['<h6>', '<h6>h6</h6>', '<h6>h6</h6>'],
  ['<h6> with attributes', '<h6 lang="en" dir="ltr" id="h6" foo>h6</h6>', '<h6 lang="en" dir="ltr">h6</h6>'],
  ['<h6> with no text', '<h6> &nbsp;\n</h6>', ''],
  ['<head>', '<head>head</head>', 'head'],
  ['<head> with attributes', '<head lang="en" dir="ltr" id="head" foo>head</head>', 'head'],
  ['<header>', '<header>header</header>', 'header'],
  ['<header> with attributes', '<header lang="en" dir="ltr" id="header" foo>header</header>', 'header'],
  ['<hr>', '<hr>', ''],
  ['<hr> with attributes', '<hr>', ''],
  ['<hr> with a body', '<hr>hr</hr>', 'hr'],
  ['<html>', '<html>html</html>', 'html'],
  ['<html> with attributes', '<html lang="en" dir="ltr" id="html" foo>html</html>', 'html'],
  ['<i>', '<i>i</i>', '<i>i</i>'],
  ['<i> with attributes', '<i lang="en" dir="ltr" id="i" foo>i</i>', '<i lang="en" dir="ltr">i</i>'],
  ['<iframe>', '<iframe>iframe</iframe>', 'iframe'],
  ['<iframe> with attributes', '<iframe lang="en" dir="ltr" id="iframe" foo>iframe</iframe>', 'iframe'],
  ['<img>', '<img>', ''],
  ['<img> with attributes', '<img src="some-image.png" alt="" lang="en" dir="ltr" id="img" foo>', ''],
  ['<img> with a body', '<img>img</img>', 'img'],
  ['<input>', '<input>', ''],
  ['<input> with attributes', '<input lang="en" dir="ltr" id="input" foo>', ''],
  ['<input> with a body', '<input>input</input>', 'input'],
  ['<ins>', '<ins>ins</ins>', 'ins'],
  ['<ins> with attributes', '<ins lang="en" dir="ltr" id="ins" foo>ins</ins>', 'ins'],
  ['<kbd>', '<kbd>kbd</kbd>', 'kbd'],
  ['<kbd> with attributes', '<kbd lang="en" dir="ltr" id="kbd" foo>kbd</kbd>', 'kbd'],
  ['<label>', '<label>label</label>', 'label'],
  ['<label> with attributes', '<label lang="en" dir="ltr" id="label" foo>label</label>', 'label'],
  ['<legend>', '<legend>legend</legend>', 'legend'],
  ['<legend> with attributes', '<legend lang="en" dir="ltr" id="legend" foo>legend</legend>', 'legend'],
  ['<li>', '<li>li</li>', '<li>li</li>'],
  ['<li> with attributes', '<li lang="en" dir="ltr" id="li" foo>li</li>', '<li lang="en" dir="ltr">li</li>'],
  ['<li> with no text', '<li> &nbsp;\n</li>', ''],
  ['<link>', '<link>', ''],
  ['<link> with attributes', '<link lang="en" dir="ltr" id="link" foo>', ''],
  ['<link> with a body', '<link>link</link>', 'link'],
  ['<main>', '<main>main</main>', 'main'],
  ['<main> with attributes', '<main lang="en" dir="ltr" id="main" foo>main</main>', 'main'],
  ['<map>', '<map>map</map>', 'map'],
  ['<map> with attributes', '<map lang="en" dir="ltr" id="map" foo>map</map>', 'map'],
  ['<mark>', '<mark>mark</mark>', 'mark'],
  ['<mark> with attributes', '<mark lang="en" dir="ltr" id="mark" foo>mark</mark>', 'mark'],
  ['<meta>', '<meta>', ''],
  ['<meta> with attributes', '<meta lang="en" dir="ltr" id="meta" foo>', ''],
  ['<meta> with a body', '<meta>meta</meta>', 'meta'],
  ['<meter>', '<meter>meter</meter>', 'meter'],
  ['<meter> with attributes', '<meter value="0" lang="en" dir="ltr" id="meter" foo>meter</meter>', 'meter'],
  ['<nav>', '<nav>nav</nav>', 'nav'],
  ['<nav> with attributes', '<nav lang="en" dir="ltr" id="nav" foo>nav</nav>', 'nav'],
  ['<noframes>', '<noframes>noframes</noframes>', 'noframes'],
  ['<noframes> with attributes', '<noframes lang="en" dir="ltr" id="noframes" foo>noframes</noframes>', 'noframes'],
  ['<noscript>', '<noscript>noscript</noscript>', 'noscript'],
  ['<noscript> with attributes', '<noscript lang="en" dir="ltr" id="noscript" foo>noscript</noscript>', 'noscript'],
  ['<object>', '<object>object</object>', 'object'],
  ['<object> with attributes', '<object lang="en" dir="ltr" id="object" foo>object</object>', 'object'],
  ['<ol>', '<ol>ol</ol>', '<ol>ol</ol>'],
  ['<ol> with attributes', '<ol lang="en" dir="ltr" id="ol" foo>ol</ol>', '<ol lang="en" dir="ltr">ol</ol>'],
  ['<ol> with no text', '<ol> &nbsp;\n</ol>', ''],
  ['<optgroup>', '<optgroup>optgroup</optgroup>', 'optgroup'],
  [
    '<optgroup> with attributes',
    '<optgroup label="optgroup" lang="en" dir="ltr" id="optgroup" foo>optgroup</optgroup>',
    'optgroup',
  ],
  ['<option>', '<option>option</option>', ''],
  ['<option> with attributes', '<option lang="en" dir="ltr" id="option" foo>option</option>', ''],
  ['<output>', '<output>output</output>', 'output'],
  ['<output> with attributes', '<output lang="en" dir="ltr" id="output" foo>output</output>', 'output'],
  ['<p>', '<p>p</p>', '<p>p</p>'],
  ['<p> with attributes', '<p lang="en" dir="ltr" id="p" foo>p</p>', '<p lang="en" dir="ltr">p</p>'],
  ['<p> with no text', '<p> &nbsp;\n</p>', ''],
  ['<param>', '<param>', ''],
  ['<param> with attributes', '<param lang="en" dir="ltr" id="param" foo>', ''],
  ['<param> with a body', '<param>param</param>', 'param'],
  ['<picture>', '<picture>picture</picture>', 'picture'],
  ['<picture> with attributes', '<picture lang="en" dir="ltr" id="picture" foo>picture</picture>', 'picture'],
  ['<pre>', '<pre>pre</pre>', 'pre'],
  ['<pre> with attributes', '<pre lang="en" dir="ltr" id="pre" foo>pre</pre>', 'pre'],
  ['<progress>', '<progress>progress</progress>', 'progress'],
  ['<progress> with attributes', '<progress lang="en" dir="ltr" id="progress" foo>progress</progress>', 'progress'],
  ['<q>', '<q>q</q>', 'q'],
  ['<q> with attributes', '<q lang="en" dir="ltr" id="q" foo>q</q>', 'q'],
  ['<rp>', '<rp>rp</rp>', 'rp'],
  ['<rp> with attributes', '<rp lang="en" dir="ltr" id="rp" foo>rp</rp>', 'rp'],
  ['<rt>', '<rt>rt</rt>', 'rt'],
  ['<rt> with attributes', '<rt lang="en" dir="ltr" id="rt" foo>rt</rt>', 'rt'],
  ['<ruby>', '<ruby>ruby</ruby>', 'ruby'],
  ['<ruby> with attributes', '<ruby lang="en" dir="ltr" id="ruby" foo>ruby</ruby>', 'ruby'],
  ['<s>', '<s>s</s>', 's'],
  ['<s> with attributes', '<s lang="en" dir="ltr" id="s" foo>s</s>', 's'],
  ['<samp>', '<samp>samp</samp>', 'samp'],
  ['<samp> with attributes', '<samp lang="en" dir="ltr" id="samp" foo>samp</samp>', 'samp'],
  ['<script>', '<script>script</script>', ''],
  ['<script> with attributes', '<script lang="en" dir="ltr" id="script" foo>script</script>', ''],
  ['<section>', '<section>section</section>', 'section'],
  ['<section> with attributes', '<section lang="en" dir="ltr" id="section" foo>section</section>', 'section'],
  ['<select>', '<select>select</select>', 'select'],
  ['<select> with attributes', '<select lang="en" dir="ltr" id="select" foo>select</select>', 'select'],
  ['<small>', '<small>small</small>', 'small'],
  ['<small> with attributes', '<small lang="en" dir="ltr" id="small" foo>small</small>', 'small'],
  ['<source>', '<source>', ''],
  ['<source> with attributes', '<source lang="en" dir="ltr" id="source" foo>', ''],
  ['<source> with a body', '<source>source</source>', 'source'],
  ['<span>', '<span>span</span>', 'span'],
  ['<span> with attributes', '<span lang="en" dir="ltr" id="span" foo>span</span>', 'span'],
  ['<strike>', '<strike>strike</strike>', 'strike'],
  ['<strike> with attributes', '<strike lang="en" dir="ltr" id="strike" foo>strike</strike>', 'strike'],
  ['<strong>', '<strong>strong</strong>', '<b>strong</b>'],
  [
    '<strong> with attributes',
    '<strong lang="en" dir="ltr" id="strong" foo>strong</strong>',
    '<b lang="en" dir="ltr">strong</b>',
  ],
  ['<style>', '<style>style</style>', ''],
  ['<style> with attributes', '<style lang="en" dir="ltr" id="style" foo>style</style>', ''],
  ['<sub>', '<sub>sub</sub>', '<sub>sub</sub>'],
  ['<sub> with attributes', '<sub lang="en" dir="ltr" id="sub" foo>sub</sub>', '<sub lang="en" dir="ltr">sub</sub>'],
  ['<summary>', '<summary>summary</summary>', 'summary'],
  ['<summary> with attributes', '<summary lang="en" dir="ltr" id="summary" foo>summary</summary>', 'summary'],
  ['<sup>', '<sup>sup</sup>', '<sup>sup</sup>'],
  ['<sup> with attributes', '<sup lang="en" dir="ltr" id="sup" foo>sup</sup>', '<sup lang="en" dir="ltr">sup</sup>'],
  ['<svg>', '<svg>svg</svg>', 'svg'],
  ['<svg> with attributes', '<svg lang="en" dir="ltr" id="svg" foo>svg</svg>', 'svg'],
  ['<table>', '<table>table</table>', 'table'],
  ['<table> with attributes', '<table lang="en" dir="ltr" id="table" foo>table</table>', 'table'],
  ['<tbody>', '<tbody>tbody</tbody>', 'tbody'],
  ['<tbody> with attributes', '<tbody lang="en" dir="ltr" id="tbody" foo>tbody</tbody>', 'tbody'],
  ['<td>', '<td>td</td>', 'td'],
  ['<td> with attributes', '<td lang="en" dir="ltr" id="td" foo>td</td>', 'td'],
  ['<template>', '<template>template</template>', 'template'],
  ['<template> with attributes', '<template lang="en" dir="ltr" id="template" foo>template</template>', 'template'],
  ['<textarea>', '<textarea>textarea</textarea>', ''],
  ['<textarea> with attributes', '<textarea lang="en" dir="ltr" id="textarea" foo>textarea</textarea>', ''],
  ['<tfoot>', '<tfoot>tfoot</tfoot>', 'tfoot'],
  ['<tfoot> with attributes', '<tfoot lang="en" dir="ltr" id="tfoot" foo>tfoot</tfoot>', 'tfoot'],
  ['<th>', '<th>th</th>', 'th'],
  ['<th> with attributes', '<th lang="en" dir="ltr" id="th" foo>th</th>', 'th'],
  ['<thead>', '<thead>thead</thead>', 'thead'],
  ['<thead> with attributes', '<thead lang="en" dir="ltr" id="thead" foo>thead</thead>', 'thead'],
  ['<time>', '<time>time</time>', 'time'],
  ['<time> with attributes', '<time lang="en" dir="ltr" id="time" foo>time</time>', 'time'],
  ['<title>', '<title>title</title>', 'title'],
  ['<title> with attributes', '<title lang="en" dir="ltr" id="title" foo>title</title>', 'title'],
  ['<tr>', '<tr>tr</tr>', 'tr'],
  ['<tr> with attributes', '<tr lang="en" dir="ltr" id="tr" foo>tr</tr>', 'tr'],
  ['<track>', '<track>', ''],
  ['<track> with attributes', '<track src="#" lang="en" dir="ltr" id="track" foo>', ''],
  ['<track> with a body', '<track>track</track>', 'track'],
  ['<tt>', '<tt>tt</tt>', 'tt'],
  ['<tt> with attributes', '<tt lang="en" dir="ltr" id="tt" foo>tt</tt>', 'tt'],
  ['<u>', '<u>u</u>', 'u'],
  ['<u> with attributes', '<u lang="en" dir="ltr" id="u" foo>u</u>', 'u'],
  ['<ul>', '<ul>ul</ul>', '<ul>ul</ul>'],
  ['<ul> with attributes', '<ul lang="en" dir="ltr" id="ul" foo>ul</ul>', '<ul lang="en" dir="ltr">ul</ul>'],
  ['<ul> with no text', '<ul> &nbsp;\n</ul>', ''],
  ['<var>', '<var>var</var>', 'var'],
  ['<var> with attributes', '<var lang="en" dir="ltr" id="var" foo>var</var>', 'var'],
  ['<video>', '<video>video</video>', 'video'],
  ['<video> with attributes', '<video lang="en" dir="ltr" id="video" foo>video</video>', 'video'],
  ['<wbr>', '<wbr>', ''],
  ['<wbr> with attributes', '<wbr lang="en" dir="ltr" id="wbr" foo>', ''],
  ['<wbr> with a body', '<wbr>wbr</wbr>', 'wbr'],
  ['<math>', '<math>math</math>', '<math>math</math>'],
  [
    '<math> with attributes',
    '<math xmlns="http://www.w3.org/1998/Math/MathML" dir="ltr" display="block" displaystyle="true" mathvariant="normal" id="math" foo>math</math>',
    '<math dir="ltr" display="block" displaystyle="true" mathvariant="normal">math</math>',
  ],
  ['<mi>', '<mi>mi</mi>', '<mi>mi</mi>'],
  [
    '<mi> with attributes',
    '<mi dir="ltr" displaystyle="true" mathvariant="normal" id="mi" foo>mi</mi>',
    '<mi dir="ltr" displaystyle="true" mathvariant="normal">mi</mi>',
  ],
  ['<mn>', '<mn>mn</mn>', '<mn>mn</mn>'],
  [
    '<mn> with attributes',
    '<mn dir="ltr" displaystyle="true" mathvariant="normal" id="mn" foo>mn</mn>',
    '<mn dir="ltr" displaystyle="true" mathvariant="normal">mn</mn>',
  ],
  ['<mo>', '<mo>mo</mo>', '<mo>mo</mo>'],
  [
    '<mo> with attributes',
    '<mo accent="true" fence="true" largeop="true" lspace="10%" maxsize="10%" minsize="10%" movablelimits="true" rspace="10%" separator="true" stretchy="true" symmetric="true" dir="ltr" displaystyle="true" mathvariant="normal" id="mo" foo>mo</mo>',
    '<mo fence="true" largeop="true" lspace="10%" maxsize="10%" minsize="10%" movablelimits="true" rspace="10%" separator="true" stretchy="true" symmetric="true" dir="ltr" displaystyle="true" mathvariant="normal">mo</mo>',
  ],
  ['<ms>', '<ms>ms</ms>', '<ms>ms</ms>'],
  [
    '<ms> with attributes',
    '<ms lquote="„" rquote="\'" dir="ltr" displaystyle="true" mathvariant="normal" id="ms" foo>ms</ms>',
    '<ms dir="ltr" displaystyle="true" mathvariant="normal">ms</ms>',
  ],
  ['<mspace>', '<mspace>mspace</mspace>', '<mspace>mspace</mspace>'],
  [
    '<mspace> with attributes',
    '<mspace depth="40px" height="20px" width="100px" dir="ltr" displaystyle="true" mathvariant="normal" id="mspace" foo>mspace</mspace>',
    '<mspace depth="40px" height="20px" width="100px" dir="ltr" displaystyle="true" mathvariant="normal">mspace</mspace>',
  ],
  ['<mtext>', '<mtext>mtext</mtext>', '<mtext>mtext</mtext>'],
  [
    '<mtext> with attributes',
    '<mtext dir="ltr" displaystyle="true" mathvariant="normal" id="mtext" foo>mtext</mtext>',
    '<mtext dir="ltr" displaystyle="true" mathvariant="normal">mtext</mtext>',
  ],
  ['<menclose>', '<menclose>menclose</menclose>', 'menclose'],
  [
    '<menclose> with attributes',
    '<menclose dir="ltr" displaystyle="true" notation="longdiv" mathvariant="normal" id="menclose" foo>menclose</menclose>',
    'menclose',
  ],
  ['<merror>', '<merror>merror</merror>', '<merror>merror</merror>'],
  [
    '<merror> with attributes',
    '<merror dir="ltr" displaystyle="true" mathvariant="normal" id="merror" foo>merror</merror>',
    '<merror dir="ltr" displaystyle="true" mathvariant="normal">merror</merror>',
  ],
  ['<mfenced>', '<mfenced>mfenced</mfenced>', 'mfenced'],
  [
    '<mfenced> with attributes',
    '<mfenced open="{" close="}" separators=";;," dir="ltr" displaystyle="true" mathvariant="normal" id="mfenced" foo>mfenced</mfenced>',
    'mfenced',
  ],
  ['<mfrac>', '<mfrac>mfrac</mfrac>', '<mfrac>mfrac</mfrac>'],
  [
    '<mfrac> with attributes',
    '<mfrac dir="ltr" denomalign="center" linethickness="0" numalign="center" displaystyle="true" mathvariant="normal" id="mfrac" foo>mfrac</mfrac>',
    '<mfrac dir="ltr" linethickness="0" displaystyle="true" mathvariant="normal">mfrac</mfrac>',
  ],
  ['<mpadded>', '<mpadded>mpadded</mpadded>', '<mpadded>mpadded</mpadded>'],
  [
    '<mpadded> with attributes',
    '<mpadded depth="10%" height="10%" lspace="10%" voffset="10%" width="10%" dir="ltr" displaystyle="true" mathvariant="normal" id="mpadded" foo>mpadded</mpadded>',
    '<mpadded depth="10%" height="10%" lspace="10%" voffset="10%" width="10%" dir="ltr" displaystyle="true" mathvariant="normal">mpadded</mpadded>',
  ],
  ['<mphantom>', '<mphantom>mphantom</mphantom>', '<mphantom>mphantom</mphantom>'],
  [
    '<mphantom> with attributes',
    '<mphantom dir="ltr" displaystyle="true" mathvariant="normal" id="mphantom" foo>mphantom</mphantom>',
    '<mphantom dir="ltr" displaystyle="true" mathvariant="normal">mphantom</mphantom>',
  ],
  ['<mroot>', '<mroot>mroot</mroot>', '<mroot>mroot</mroot>'],
  [
    '<mroot> with attributes',
    '<mroot dir="ltr" displaystyle="true" mathvariant="normal" id="mroot" foo>mroot</mroot>',
    '<mroot dir="ltr" displaystyle="true" mathvariant="normal">mroot</mroot>',
  ],
  ['<mrow>', '<mrow>mrow</mrow>', '<mrow>mrow</mrow>'],
  [
    '<mrow> with attributes',
    '<mrow dir="ltr" displaystyle="true" mathvariant="normal" id="mrow" foo>mrow</mrow>',
    '<mrow dir="ltr" displaystyle="true" mathvariant="normal">mrow</mrow>',
  ],
  ['<msqrt>', '<msqrt>msqrt</msqrt>', '<msqrt>msqrt</msqrt>'],
  [
    '<msqrt> with attributes',
    '<msqrt dir="ltr" displaystyle="true" mathvariant="normal" id="msqrt" foo>msqrt</msqrt>',
    '<msqrt dir="ltr" displaystyle="true" mathvariant="normal">msqrt</msqrt>',
  ],
  ['<mstyle>', '<mstyle>mstyle</mstyle>', 'mstyle'],
  [
    '<mstyle> with attributes',
    '<mstyle dir="ltr" displaystyle="true" mathvariant="normal" id="mstyle" foo>mstyle</mstyle>',
    'mstyle',
  ],
  ['<mmultiscripts>', '<mmultiscripts>mmultiscripts</mmultiscripts>', '<mmultiscripts>mmultiscripts</mmultiscripts>'],
  [
    '<mmultiscripts> with attributes',
    '<mmultiscripts subscriptshift="10%" superscriptshift="10%" dir="ltr" displaystyle="true" mathvariant="normal" id="mmultiscripts" foo>mmultiscripts</mmultiscripts>',
    '<mmultiscripts dir="ltr" displaystyle="true" mathvariant="normal">mmultiscripts</mmultiscripts>',
  ],
  ['<mover>', '<mover>mover</mover>', '<mover>mover</mover>'],
  [
    '<mover> with attributes',
    '<mover accent="true" dir="ltr" displaystyle="true" mathvariant="normal" id="mover" foo>mover</mover>',
    '<mover accent="true" dir="ltr" displaystyle="true" mathvariant="normal">mover</mover>',
  ],
  ['<mprescripts>', '<mprescripts>mprescripts</mprescripts>', '<mprescripts>mprescripts</mprescripts>'],
  [
    '<mprescripts> with attributes',
    '<mprescripts dir="ltr" displaystyle="true" mathvariant="normal" id="mprescripts" foo>mprescripts</mprescripts>',
    '<mprescripts dir="ltr" displaystyle="true" mathvariant="normal">mprescripts</mprescripts>',
  ],
  ['<msub>', '<msub>msub</msub>', '<msub>msub</msub>'],
  [
    '<msub> with attributes',
    '<msub subscriptshift="10%" dir="ltr" displaystyle="true" mathvariant="normal" id="msub" foo>msub</msub>',
    '<msub dir="ltr" displaystyle="true" mathvariant="normal">msub</msub>',
  ],
  ['<msubsup>', '<msubsup>msubsup</msubsup>', '<msubsup>msubsup</msubsup>'],
  [
    '<msubsup> with attributes',
    '<msubsup subscriptshift="10% superscriptshift="10%" dir="ltr" displaystyle="true" mathvariant="normal" id="msubsup" foo>msubsup</msubsup>',
    '<msubsup dir="ltr" displaystyle="true" mathvariant="normal">msubsup</msubsup>',
  ],
  ['<msup>', '<msup>msup</msup>', '<msup>msup</msup>'],
  [
    '<msup> with attributes',
    '<msup superscriptshift="10%" dir="ltr" displaystyle="true" mathvariant="normal" id="msup" foo>msup</msup>',
    '<msup dir="ltr" displaystyle="true" mathvariant="normal">msup</msup>',
  ],
  ['<munder>', '<munder>munder</munder>', '<munder>munder</munder>'],
  [
    '<munder> with attributes',
    '<munder accentunder="true" dir="ltr" displaystyle="true" mathvariant="normal" id="munder" foo>munder</munder>',
    '<munder accentunder="true" dir="ltr" displaystyle="true" mathvariant="normal">munder</munder>',
  ],
  ['<munderover>', '<munderover>munderover</munderover>', '<munderover>munderover</munderover>'],
  [
    '<munderover> with attributes',
    '<munderover accent="true" accentunder="true" dir="ltr" displaystyle="true" mathvariant="normal" id="munderover" foo>munderover</munderover>',
    '<munderover accent="true" accentunder="true" dir="ltr" displaystyle="true" mathvariant="normal">munderover</munderover>',
  ],
  ['<mtable>', '<mtable>mtable</mtable>', '<mtable>mtable</mtable>'],
  [
    '<mtable> with attributes',
    '<mtable align="axis" columnalign="center" columnlines="none" columnspacing="10%" frame="none" framespacing="10%" rowalign="baseline" rowlines="none" rowspacing="10%" width="10%" dir="ltr" displaystyle="true" mathvariant="normal" id="mtable" foo>mtable</mtable>',
    '<mtable dir="ltr" displaystyle="true" mathvariant="normal">mtable</mtable>',
  ],
  ['<mtd>', '<mtd>mtd</mtd>', '<mtd>mtd</mtd>'],
  [
    '<mtd> with attributes',
    '<mtd columnspan="1" rowspan="1" columnalign="center" rowalign="center" dir="ltr" displaystyle="true" mathvariant="normal" id="mtd" foo>mtd</mtd>',
    '<mtd columnspan="1" rowspan="1" dir="ltr" displaystyle="true" mathvariant="normal">mtd</mtd>',
  ],
  ['<mtr>', '<mtr>mtr</mtr>', '<mtr>mtr</mtr>'],
  [
    '<mtr> with attributes',
    '<mtr columnalign="center" rowalign="center" dir="ltr" displaystyle="true" mathvariant="normal" id="mtr" foo>mtr</mtr>',
    '<mtr dir="ltr" displaystyle="true" mathvariant="normal">mtr</mtr>',
  ],

  ['<maction>', '<maction>maction</maction>', 'maction'],
  [
    '<maction> with attributes',
    '<maction actiontype="toggle" selection="1" dir="ltr" displaystyle="true" mathvariant="normal" id="maction" foo>maction</maction>',
    'maction',
  ],
  ['<annotation>', '<annotation>annotation</annotation>', '<annotation>annotation</annotation>'],
  [
    '<annotation> with attributes',
    '<annotation encoding="image/png" src="some/path/formula.png" dir="ltr" displaystyle="true" mathvariant="normal" id="annotation" foo>annotation</annotation>',
    '<annotation encoding="image/png" dir="ltr" displaystyle="true" mathvariant="normal">annotation</annotation>',
  ],
  ['<annotation-xml>', '<annotation-xml>annotation-xml</annotation-xml>', ''],
  [
    '<annotation-xml> with attributes',
    '<annotation-xml encoding="image/png" src="some/path/formula.png" dir="ltr" displaystyle="true" mathvariant="normal" id="annotation" foo>annotation-xml</annotation-xml>',
    '',
  ],
  ['<semantics>', '<semantics>semantics</semantics>', '<semantics>semantics</semantics>'],
  [
    '<semantics> with attributes',
    '<semantics dir="ltr" displaystyle="true" mathvariant="normal" id="semantics" foo>semantics</semantics>',
    '<semantics dir="ltr" displaystyle="true" mathvariant="normal">semantics</semantics>',
  ],
  [
    'with inline math',
    '$g_J$',
    '<math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>',
  ],
  [
    'with math with a comment at the end',
    '$x = 1 % comment$',
    '<math><semantics><mrow><mi>x</mi><mo>=</mo><mn>1</mn></mrow><annotation encoding="application/x-tex">x = 1 % comment</annotation></semantics></math>',
  ],
  [
    'with math containing an emoji',
    '$✌$',
    '<math><semantics><mrow><mtext>✌</mtext></mrow><annotation encoding="application/x-tex">✌</annotation></semantics></math>',
  ],
  [
    'with math containing extended Latin',
    '$š$',
    '<math><semantics><mrow><mover accent="true"><mi>s</mi><mo>ˇ</mo></mover></mrow><annotation encoding="application/x-tex">š</annotation></semantics></math>',
  ],
  [
    'with multiple inline math',
    '$a$$b$$c$',
    '<math><semantics><mrow><mi>a</mi></mrow><annotation encoding="application/x-tex">a</annotation></semantics></math><math><semantics><mrow><mi>b</mi></mrow><annotation encoding="application/x-tex">b</annotation></semantics></math><math><semantics><mrow><mi>c</mi></mrow><annotation encoding="application/x-tex">c</annotation></semantics></math>',
  ],
  [
    'with block math',
    '$$g_J$$',
    '<math display="block"><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>',
  ],
  ['with money', '$1 to $2', '$1 to $2'],
  ['with lots of money', '$100,000 to $200,000', '$100,000 to $200,000'],
  ['with even more money', '$1.5 to $2.1 million', '$1.5 to $2.1 million'],
])('sanitizeHtml (%s)', (_name, input, expected) => {
  const actual = _.sanitizeHtml(input)

  expect(actual.toString()).toBe(expected)
})

test.each([
  ['single heading same level 1', 1 as const, '<h1>Foo</h1>', '<h2>Foo</h2>'],
  ['single heading same level 2', 2 as const, '<h2>Foo</h2>', '<h3>Foo</h3>'],
  ['single heading 1 level below', 1 as const, '<h2>Foo</h2>', '<h2>Foo</h2>'],
  ['single heading 1 level above', 2 as const, '<h1>Foo</h1>', '<h3>Foo</h3>'],
  ['single heading 2 levels below', 1 as const, '<h3>Foo</h3>', '<h2>Foo</h2>'],
  ['single heading 2 levels above', 3 as const, '<h1>Foo</h1>', '<h4>Foo</h4>'],
  ['multiple headings same level 1', 1 as const, '<h1>Foo</h1><h2>Bar</h2>', '<h2>Foo</h2><h3>Bar</h3>'],
  ['multiple headings same level 2', 2 as const, '<h2>Foo</h2><h3>Bar</h3>', '<h3>Foo</h3><h4>Bar</h4>'],
  ['multiple headings 1 level below', 1 as const, '<h2>Foo</h2><h3>Bar</h3>', '<h2>Foo</h2><h3>Bar</h3>'],
  ['multiple headings 1 level above', 2 as const, '<h1>Foo</h1><h2>Bar</h2>', '<h3>Foo</h3><h4>Bar</h4>'],
  ['multiple headings 2 levels below', 1 as const, '<h3>Foo</h3><h4>Bar</h4>', '<h2>Foo</h2><h3>Bar</h3>'],
  ['multiple headings 2 levels above', 3 as const, '<h1>Foo</h1><h2>Bar</h2>', '<h4>Foo</h4><h5>Bar</h5>'],
  [
    'with attributes',
    1 as const,
    '<h1 lang="en" dir="ltr" id="h1" foo>Foo</h1>',
    '<h2 lang="en" dir="ltr" id="h1" foo>Foo</h2>',
  ],
  ['with space', 1 as const, '  \n <h1\n>Foo</h1  > \n  \n', '  \n <h2\n>Foo</h2  > \n  \n'],
  [
    'without a heading',
    1 as const,
    ' \n<p lang="en" dir="ltr"\nid="p" foo>p</p> \n',
    ' \n<p lang="en" dir="ltr"\nid="p" foo>p</p> \n',
  ],
  [
    "with things that aren't headings",
    1 as const,
    '< h1>Foo</h1>&lt;h1>Bar</h1><hh1>Baz</hh1>',
    '< h1>Foo</h1>&lt;h1>Bar</h1><hh1>Baz</hh1>',
  ],
])('fixHeadingLevels (%s)', (_name, currentLevel, input, expected) => {
  const actual = _.fixHeadingLevels(currentLevel, _.rawHtml(input))

  expect(actual.toString()).toBe(expected)
})

test.prop([fc.html().map(html => [html.toString(), html.toString()] as const)], {
  examples: [
    [
      [
        '$g_J$',
        '<math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>',
      ],
    ],
    [
      [
        '$$g_J$$',
        '<math display="block"><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>',
      ],
    ],
    [['$1 to $2', '$1 to $2']],
    [['$100,000 to $200,000', '$100,000 to $200,000']],
    [['$1.5 to $2.1 million', '$1.5 to $2.1 million']],
  ],
})('rawHtml', ([input, expected]) => {
  const actual = _.rawHtml(input)

  expect(actual.toString()).toBe(expected)
})

describe('plainText', () => {
  test.each([
    ['tag', 'a b<a>c</a>d e', 'a bcd e'],
    ['tag with attributes', '<a href="http://example.com/" lang="en" dir="ltr" id="a" foo>a</a>', 'a'],
    ['entities', _.html`&amp;&lt;&gt;&copy;`, '&<>©'],
    ['mismatched tags', '<b><i>bold italic</b> plain</i>', 'bold italic plain'],
    ['comment', 'a<!-- comment -->b', 'ab'],
    [
      'inline math',
      '<math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>',
      '$g_J$',
    ],
    [
      'block math',
      '<math display="block"><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>',
      '$$g_J$$',
    ],
  ])('with a string (%s)', (_name, input, expected) => {
    const actual = _.plainText(input)

    expect(actual.toString()).toBe(expected)
  })

  test.each([
    ['tag', _.html`a b<a>c</a>d e`, 'a bcd e'],
    ['tag with attributes', _.html`<a href="http://example.com/" lang="en" dir="ltr" id="a" foo>a</a>`, 'a'],
    ['entities', _.html`&amp;&lt;&gt;&copy;`, '&<>©'],
    ['mismatched tags', _.html`<b><i>bold italic</b> plain</i`, 'bold italic plain'],
    ['comment', _.html`a<!-- comment -->b`, 'ab'],
    [
      'inline math',
      _.html`<math><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>`,
      '$g_J$',
    ],
    [
      'block math',
      _.html`<math display="block"><semantics><mrow><msub><mi>g</mi><mi>J</mi></msub></mrow><annotation encoding="application/x-tex">g_J</annotation></semantics></math>`,
      '$$g_J$$',
    ],
  ])('with HTML (%s)', (_name, input, expected) => {
    const actual = _.plainText(input)

    expect(actual.toString()).toBe(expected)
  })

  test('with a template literal', () => {
    const actual = _.plainText`a b${_.html`<a>c&amp;</a>`}${[_.html`<b>d </b>`, _.html`<i> e</i>`]}${'<p>f&amp;</p>'}${[
      _.plainText`g `,
      _.plainText` h`,
    ]}${1}i j`

    expect(actual.toString()).toBe('a bc&d  e<p>f&amp;</p>g  h1i j')
  })
})

describe('RawHtmlC', () => {
  describe('decode', () => {
    test.prop([fc.string()])('with a string', string => {
      const actual = _.RawHtmlC.decode(string)

      expect(actual).toStrictEqual(D.success(_.rawHtml(string)))
    })

    test.prop([fc.html()])('with HTML', html => {
      const actual = _.RawHtmlC.decode(html)

      expect(actual).toStrictEqual(D.success(html))
    })

    test.prop([fc.anything().filter(value => typeof value !== 'string' && !(value instanceof String))])(
      'with a non-string',
      value => {
        const actual = _.RawHtmlC.decode(value)

        expect(actual).toStrictEqual(E.left(expect.anything()))
      },
    )
  })

  test.prop([fc.html()])('encode', html => {
    const actual = _.RawHtmlC.encode(html)

    expect(actual).toStrictEqual(html.toString())
  })
})
