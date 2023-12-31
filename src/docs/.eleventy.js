const pluginSyntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')
const pluginNavigation = require('@11ty/eleventy-navigation')
const { dirname, resolve, join, relative } = require('path')
const cheerio = require('cheerio')
const contentDir = resolve(__dirname, './content')
const pathPrefix = '/'

const mdIt = require('markdown-it')
const mdItAnchor = require('markdown-it-anchor')
const mdOpts = { html: true }
const mdAnchorOpts = {}
const md = mdIt(mdOpts).use(mdItAnchor, mdAnchorOpts)
const pluginTOC = require('eleventy-plugin-toc')
const { EleventyRenderPlugin } = require('@11ty/eleventy')

const { readFileSync } = require('fs')
const maybeReadFile = p => {
  try {
    return readFileSync(p, 'utf8')
  } catch (er) {
    console.error('failed reading file', p, er)
    return ''
  }
}

module.exports = eleventyConfig => {
  eleventyConfig.setQuietMode(true)
  eleventyConfig.setLibrary('md', md)
  eleventyConfig.addPlugin(EleventyRenderPlugin)
  eleventyConfig.addGlobalData(
    'tapVersion',
    JSON.parse(
      maybeReadFile(resolve(__dirname, '../tap/package.json'))
    ).version
  )
  eleventyConfig.setUseGitIgnore(false)
  eleventyConfig.addPlugin(pluginTOC)
  eleventyConfig.addPlugin(pluginSyntaxHighlight)
  eleventyConfig.addPlugin(pluginNavigation)
  eleventyConfig.addPassthroughCopy({
    'content/static': 'static',
  })
  eleventyConfig.addPassthroughCopy('content/*.{jpg,png,gif}')
  eleventyConfig.addPassthroughCopy(
    'content/!(static)/**/*.{jpg,png,gif}'
  )

  eleventyConfig.setDataDeepMerge(true)
  eleventyConfig.addFilter('json', function (obj) {
    return JSON.stringify(obj, null, 2)
  })

  const readmeReplacements = new Map()
  eleventyConfig.addFilter('readmeInclude', function (content) {
    const re = /\[\[README-INCLUDE=([^\]]+)\]\]/g
    let match
    const replacements = []
    while ((match = re.exec(content))) {
      const pkg = match[1]
      replacements.push(match[0])
      if (readmeReplacements.has(match[0])) continue
      const rm = md.render(
        maybeReadFile(
          resolve(
            require.resolve(`${pkg}/package.json`),
            '../README.md'
          )
        ).replace(
          /^# [^\n]+\n/,
          `[\`${pkg}\`](https://tapjs.github.io/tapjs/modules/${pkg.replace(
            /[@\/-]/g,
            '_'
          )}.html)\n`
        )
      )
      readmeReplacements.set(match[0], rm)
    }
    for (const r of replacements) {
      content = content.split(r).join(readmeReplacements.get(r))
    }
    return content
  })

  eleventyConfig.addFilter('selfLinks', function (content) {
    if (!content) return content
    const $ = cheerio.load(content)
    // add a self-link on the TOC-ified headings
    for (const hn of $(
      'h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'
    )) {
      const { tabindex, id } = hn.attribs
      if (!tabindex || !id) {
        continue
      }
      const $hn = $(hn)
      const content = $hn.html()
      $hn.html(
        content +
          `<a tabindex="-1" class="selflink" href="#${id}">#</a>`
      )
    }
    // return content
    return '<!doctype html><html>' + $('html').html() + '</html>'
  })

  // turn github markdown friendly links like ./blah.md or /content/blah.md
  // into their appropriate urls, like /blah
  eleventyConfig.addTransform('localLinks', function (content) {
    const { inputPath } = this
    const $ = cheerio.load(content)
    // update the "From plugin" headings in the CLI config page to link
    // to the relevant plugin docs page.
    for (const h2 of $('h2')) {
      const $h2 = $(h2)
      const m = $h2.html().match(/^From plugin: @tapjs\/([^ <]+)(.*$)/)
      if (!m) continue
      $h2.html(
        `From plugin: <a href="/plugins/${m[1]}">@tapjs/${m[1]}</a>${m[2]}`
      )
    }
    const prod = /^https:\/\/(www\.)?node-tap(\.org|\.surge\.sh)\//
    for (const link of $('a[href]')) {
      const { href } = link.attribs
      if (prod.test(href)) {
        link.attribs.href = href.replace(prod, '/')
      }

      if (
        /^https?:/.test(href) ||
        !/\.(md|json|11ty\.js)(#.*)?$/.test(href)
      ) {
        continue
      }
      const file = href.startsWith('/')
        ? join(__dirname, href)
        : resolve(dirname(inputPath), href)
      const rel = relative(contentDir, file)
      const url = join(
        pathPrefix,
        join('/', rel).replace(
          /(?:\/index)?\.(?:md|11ty.js)(#.*)?$/,
          '/$1'
        )
      )
      link.attribs.href = url
    }
    return '<!doctype html><html>' + $('html').html() + '</html>'
  })

  eleventyConfig.addTransform('localImage', function (content) {
    const { inputPath } = this
    const $ = cheerio.load(content)
    for (const img of $('img[src]')) {
      const { src } = img.attribs
      if (/^https?:/.test(src) || src.startsWith('/')) {
        continue
      }
      const file = src.startsWith('/')
        ? join(__dirname, src)
        : resolve(dirname(inputPath), src)
      const rel = relative(contentDir, file)
      const url = join(pathPrefix, join('/', rel))
      img.attribs.src = url
    }
    return '<!doctype html><html>' + $('html').html() + '</html>'
  })

  return {
    dataTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
    pathPrefix,
    dir: {
      data: '../_data',
      input: 'content',
      includes: '../_includes',
      layouts: '../_includes/layouts',
      output: '_site',
    },
  }
}
