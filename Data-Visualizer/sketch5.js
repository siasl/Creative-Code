import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart width (all three parts share it).
const width = 640

const likedSongs = await d3.json('./assets/LikedSongs_enriched.json')

// One record per song that has an album cover, in the order the songs were added.
// cover_color was computed from each 64px cover: the cover is reduced to a 6-color palette,
// "dominant" is the color covering the most area, and "accent" is the biggest colorful
// (not black, white or gray) color covering at least 5% of the cover.
const songs = likedSongs
  .filter(entry => entry.enrichment.cover_color)
  .map(entry => ({
    title: entry.track.name,
    artist: entry.track.artists.map(a => a.name).join(', '),
    cover: [...entry.track.album.images].reverse().find(img => img.width >= 72)?.url,
    added: new Date(entry.added_at),
    genre: entry.enrichment.genres.main,
    dominant: entry.enrichment.cover_color.dominant,
    bucket: entry.enrichment.cover_color.bucket,
    accent: entry.enrichment.cover_color.accent,
    accentBucket: entry.enrichment.cover_color.accent_bucket
  }))
  .sort((a, b) => a.added - b.added)

// Named color groups, with a swatch color to draw each one.
const buckets = ['black', 'gray', 'white', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']
const swatch = d3
  .scaleOrdinal()
  .domain(buckets)
  .range(['#222', '#9e9e9e', '#f4f4f4', '#8d5a3b', '#d23c3c', '#ef8a2b', '#f2cf3a', '#4caf50', '#3b78c4', '#8a4fbf', '#e77fb3'])

// Which color the charts use: the cover's dominant color, or its main accent color.
let mode = 'dominant'
const colorOf = d => (mode === 'dominant' ? d.dominant : d.accent ?? '#e2e2e2')
const bucketOf = d => (mode === 'dominant' ? d.bucket : d.accentBucket ?? 'no accent')

const container = d3.select('#container5')

// ---- Toggle between dominant and accent color --------------------------------

const toggle = container
  .append('div')
  .style('display', 'flex')
  .style('gap', '16px')
  .style('margin-bottom', '8px')
  .style('font', '13px sans-serif')

for (const [value, text] of [
  ['dominant', 'Dominant color'],
  ['accent', 'Main accent color (ignores black, white and gray)']
]) {
  const option = toggle.append('label').style('cursor', 'pointer')
  option
    .append('input')
    .attr('type', 'radio')
    .attr('name', 'cover-color-mode')
    .attr('value', value)
    .property('checked', value === mode)
    .on('change', () => {
      mode = value
      update()
    })
  option.append('span').text(' ' + text)
}

// ---- Info bar: names the song you're hovering over ---------------------------

const info = container
  .append('div')
  .style('height', '44px')
  .style('padding', '0 12px')
  .style('display', 'flex')
  .style('align-items', 'center')
  .style('gap', '8px')
  .style('background', 'white')
  .style('border-bottom', '1px solid #e5e5e5')
  .style('font', '14px sans-serif')
  .style('white-space', 'nowrap')
  .style('overflow', 'hidden')

function showInfo(d) {
  info.html('')
  if (!d) {
    info
      .append('span')
      .style('color', '#999')
      .text(`${songs.length.toLocaleString()} songs, oldest first. Hover over a square to see the song.`)
    return
  }
  if (d.cover) info.append('img').attr('src', d.cover).attr('alt', '').style('width', '36px').style('height', '36px').style('border-radius', '3px').style('flex-shrink', '0')
  info.append('strong').text(d.title).style('overflow', 'hidden').style('text-overflow', 'ellipsis')
  info.append('span').text(d.artist).style('color', '#666').style('overflow', 'hidden').style('text-overflow', 'ellipsis')
  info
    .append('span')
    .style('margin-left', 'auto')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('gap', '6px')
    .style('color', '#666')
    .style('font-size', '12px')
    .call(s => s.append('span').style('width', '14px').style('height', '14px').style('border', '1px solid #ccc').style('background', colorOf(d)))
    .call(s => s.append('span').text(bucketOf(d)))
}

// ---- Part 1: mosaic of every song, colored by its cover ----------------------

const cell = 10
const labelWidth = 36
const columns = Math.floor((width - labelWidth) / cell)
const rows = Math.ceil(songs.length / columns)

const mosaic = container
  .append('svg')
  .attr('width', width)
  .attr('height', rows * cell)
  .attr('style', 'display: block; background: white;')

const squaresGroup = mosaic.append('g').attr('transform', `translate(${labelWidth},0)`)

const squares = squaresGroup
  .selectAll('rect')
  .data(songs)
  .join('rect')
  .attr('x', (d, i) => (i % columns) * cell)
  .attr('y', (d, i) => Math.floor(i / columns) * cell)
  .attr('width', cell - 1)
  .attr('height', cell - 1)
  .on('mouseover', function (event, d) {
    // Move the single highlight box onto this square (instead of outlining the square itself,
    // which could leave stray outlines behind when the mouse moved quickly).
    highlight.attr('x', this.getAttribute('x')).attr('y', this.getAttribute('y')).style('display', null)
    showInfo(d)
  })

// One outline box that follows the mouse. It ignores the mouse itself so it never blocks a square.
const highlight = squaresGroup
  .append('rect')
  .attr('width', cell - 1)
  .attr('height', cell - 1)
  .attr('fill', 'none')
  .attr('stroke', '#000')
  .attr('stroke-width', 1.5)
  .attr('pointer-events', 'none')
  .style('display', 'none')

// Leaving the mosaic hides the outline and resets the info bar.
mosaic.on('mouseleave', () => {
  highlight.style('display', 'none')
  showInfo(null)
})

// Year labels on the left, at the row where each year's songs begin.
const yearStarts = d3.rollups(
  songs.map((d, i) => ({ year: d.added.getUTCFullYear(), row: Math.floor(i / columns) })),
  v => d3.min(v, d => d.row),
  d => d.year
)
mosaic
  .append('g')
  .style('font', '10px sans-serif')
  .style('fill', '#666')
  .selectAll('text')
  // Skip a label if it would overlap the one above it (early years have only a row or two of songs).
  .data(yearStarts.filter(([, row], i, all) => i === 0 || row - all[i - 1][1] >= 2))
  .join('text')
  .attr('x', 0)
  .attr('y', ([, row]) => row * cell + 8)
  .text(([year]) => year)

// ---- Part 2: share of songs in each color group -------------------------------

const barHeight = 18
const barMargin = { top: 28, left: 80, right: 80 }
const shareSvg = container
  .append('svg')
  .attr('width', width)
  .attr('style', 'display: block; margin-top: 24px; font: 11px sans-serif;')

shareSvg.append('text').attr('y', 14).style('font-weight', 'bold').style('font-size', '13px').text('Share of songs by cover color')

// ---- Part 3: color mix within each of the 8 biggest genre families -----------

const genreSvg = container
  .append('svg')
  .attr('width', width)
  .attr('style', 'display: block; margin-top: 24px; font: 11px sans-serif;')

genreSvg.append('text').attr('y', 14).style('font-weight', 'bold').style('font-size', '13px').text('Cover colors within each genre')

const topGenres = d3
  .rollups(songs.filter(d => d.genre), v => v.length, d => d.genre)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([genre]) => genre)

// ---- Draw (and redraw when the toggle changes) --------------------------------

function update() {
  const groups = mode === 'dominant' ? buckets : buckets.filter(b => !['black', 'gray', 'white'].includes(b)).concat('no accent')
  const groupColor = g => (g === 'no accent' ? '#e2e2e2' : swatch(g))

  // Part 1
  squares.transition().duration(500).attr('fill', colorOf)

  // Part 2: one bar per color group
  const counts = d3.rollup(songs, v => v.length, bucketOf)
  const shares = groups.map(g => ({ group: g, count: counts.get(g) ?? 0 })).sort((a, b) => b.count - a.count)
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(shares, d => d.count)])
    .range([barMargin.left, width - barMargin.right])
  shareSvg.attr('height', barMargin.top + shares.length * (barHeight + 4))

  shareSvg
    .selectAll('g.bar')
    .data(shares, d => d.group)
    .join(enter => {
      const g = enter.append('g').attr('class', 'bar')
      g.append('text').attr('class', 'name').attr('x', barMargin.left - 6).attr('dy', '0.32em').attr('text-anchor', 'end')
      g.append('rect').attr('x', barMargin.left).attr('height', barHeight).attr('y', -barHeight / 2).attr('stroke', '#ccc')
      g.append('text').attr('class', 'value').attr('dy', '0.32em').style('fill', '#666')
      return g
    })
    .call(g => g.transition().duration(500).attr('transform', (d, i) => `translate(0,${barMargin.top + i * (barHeight + 4) + barHeight / 2})`))
    .call(g => g.select('.name').text(d => d.group))
    .call(g => g.select('rect').attr('fill', d => groupColor(d.group)).transition().duration(500).attr('width', d => x(d.count) - barMargin.left))
    .call(g =>
      g
        .select('.value')
        .text(d => `${d3.format('.0%')(d.count / songs.length)} (${d.count})`)
        .transition()
        .duration(500)
        .attr('x', d => x(d.count) + 4)
    )

  // Part 3: a 100% stacked bar per genre, segments in the same order as the groups list
  const rowHeight = 22
  const g3 = { top: 28, left: 140, right: 10 }
  const sx = d3.scaleLinear().domain([0, 1]).range([g3.left, width - g3.right])
  const genreRows = topGenres.map(genre => {
    const inGenre = songs.filter(d => d.genre === genre)
    const c = d3.rollup(inGenre, v => v.length, bucketOf)
    let start = 0
    const segments = groups.map(group => {
      const share = (c.get(group) ?? 0) / inGenre.length
      const seg = { genre, group, share, start, count: c.get(group) ?? 0 }
      start += share
      return seg
    })
    return { genre, total: inGenre.length, segments }
  })
  genreSvg.attr('height', g3.top + genreRows.length * rowHeight)

  const row = genreSvg
    .selectAll('g.row')
    .data(genreRows, d => d.genre)
    .join(enter => {
      const g = enter.append('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${g3.top + i * rowHeight})`)
      g.append('text').attr('x', g3.left - 6).attr('y', rowHeight / 2 - 2).attr('dy', '0.32em').attr('text-anchor', 'end')
      return g
    })
  row.select('text').text(d => `${d.genre} (${d.total})`)

  row
    .selectAll('rect')
    .data(d => d.segments, d => d.group)
    .join('rect')
    .attr('y', 0)
    .attr('height', rowHeight - 4)
    .attr('fill', d => groupColor(d.group))
    .call(r => r.selectAll('title').remove())
    .call(r => r.append('title').text(d => `${d.genre}: ${d3.format('.0%')(d.share)} ${d.group} (${d.count} songs)`))
    .transition()
    .duration(500)
    .attr('x', d => sx(d.start))
    .attr('width', d => Math.max(0, sx(d.start + d.share) - sx(d.start)))
}

showInfo(null)
update()
