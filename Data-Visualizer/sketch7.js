import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart dimensions.
const width = 900
const height = 900
const ringRadius = 300 // where the genre dots sit
const minSongsPerGenre = 10

// Broad labels that just restate a genre family. They're attached to so many songs that they'd
// link to everything, so they're left out to let the more specific connections show.
const generic = new Set(['rock', 'hip hop', 'pop', 'electronic', 'dance', 'folk', 'country', 'jazz', 'blues', 'reggae',
  'latin', 'r&b', 'soul', 'funk', 'alternative', 'african', 'classical', 'world music', 'soundtrack'])

const likedSongs = await d3.json('./assets/LikedSongs_enriched.json')

// Each song with its specific genres (every source, standardized), its main family, and its cover.
const songs = likedSongs
  .filter(entry => entry.enrichment.genres.main)
  .map(entry => ({
    title: entry.track.name,
    artist: entry.track.artists.map(a => a.name).join(', '),
    album: entry.track.album.id,
    cover: [...entry.track.album.images].reverse().find(img => img.width >= 64)?.url,
    family: entry.enrichment.genres.main,
    genres: entry.enrichment.genres.all.filter(g => !generic.has(g))
  }))

// ---- Nodes: genres with enough songs ------------------------------------------

const songsByGenre = d3.group(songs.flatMap(s => s.genres.map(g => [g, s])), ([g]) => g)
const nodes = Array.from(songsByGenre, ([genre, pairs]) => {
  const list = pairs.map(([, s]) => s)
  // A genre's family is the main family most of its songs belong to.
  const family = d3.greatest(d3.rollups(list, v => v.length, s => s.family), ([, n]) => n)[0]
  return { genre, family, songs: list }
}).filter(n => n.songs.length >= minSongsPerGenre)
const kept = new Set(nodes.map(n => n.genre))

// Colors match the genre bubble chart (families ordered by size).
const familyOrder = d3
  .rollups(songs, v => v.length, s => s.family)
  .sort((a, b) => b[1] - a[1])
  .map(([f]) => f)
const color = d3
  .scaleOrdinal()
  .domain(familyOrder)
  .range(d3.schemeTableau10.concat(d3.schemeDark2.slice(0, 5)))

// Place the dots around the ring: grouped by family (biggest family first), biggest genre first
// within each family, with a small gap between families.
nodes.sort((a, b) => familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family) || b.songs.length - a.songs.length)
const familiesShown = [...new Set(nodes.map(n => n.family))]
const gap = 0.02 // radians between families
const step = (2 * Math.PI - gap * familiesShown.length) / nodes.length
let angle = 0
let previousFamily = nodes[0].family
for (const n of nodes) {
  if (n.family !== previousFamily) {
    angle += gap
    previousFamily = n.family
  }
  n.angle = angle
  n.x = ringRadius * Math.sin(angle)
  n.y = -ringRadius * Math.cos(angle)
  angle += step
}
const byGenre = new Map(nodes.map(n => [n.genre, n]))

// ---- Links: how many songs each pair of genres shares --------------------------

const pairCounts = new Map()
for (const s of songs) {
  const gs = [...new Set(s.genres.filter(g => kept.has(g)))].sort()
  for (let i = 0; i < gs.length; i++) {
    for (let j = i + 1; j < gs.length; j++) {
      const key = gs[i] + '|' + gs[j]
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
    }
  }
}
const allLinks = Array.from(pairCounts, ([key, count]) => {
  const [a, b] = key.split('|')
  return { source: byGenre.get(a), target: byGenre.get(b), count }
}).sort((a, b) => a.count - b.count) // draw strong links last, on top

const container = d3.select('#container7')

// ---- Slider: minimum shared songs for a link --------------------------------------

let minShared = 10
const controls = container.append('div').style('font', '13px sans-serif').style('margin-bottom', '8px')
const sliderLabel = controls.append('span')
controls
  .append('input')
  .attr('type', 'range')
  .attr('min', 3)
  .attr('max', 60)
  .attr('value', minShared)
  .style('vertical-align', 'middle')
  .style('margin-left', '8px')
  .style('width', '200px')
  .on('input', function () {
    minShared = +this.value
    drawLinks()
  })

// ---- Info bar -------------------------------------------------------------------

const info = container
  .append('div')
  .style('min-height', '84px')
  .style('padding', '8px 12px')
  .style('background', 'white')
  .style('border-bottom', '1px solid #e5e5e5')
  .style('font', '13px/1.5 sans-serif')
  .style('color', '#555')

function showInfo(n) {
  info.html('')
  if (!n) {
    info.text(
      `${nodes.length} genres, each with at least ${minSongsPerGenre} of my songs, colored by genre family. ` +
        'Lines connect genres that are tagged on the same songs; thicker lines mean more shared songs. ' +
        'Hover over a genre to see its connections, or click it to keep it selected.'
    )
    return
  }
  const neighbors = allLinks
    .filter(l => l.count >= minShared && (l.source === n || l.target === n))
    .map(l => ({ other: l.source === n ? l.target : l.source, count: l.count }))
    .sort((a, b) => b.count - a.count)
  const head = info.append('div')
  head.append('strong').style('color', '#222').text(n.genre)
  head.append('span').text(` · ${n.family} · ${n.songs.length} songs · linked to ${neighbors.length} genres`)
  if (neighbors.length) {
    info
      .append('div')
      .text('Shares the most songs with: ' + neighbors.slice(0, 6).map(d => `${d.other.genre} (${d.count})`).join(', '))
  }
  // A strip of album covers from this genre (one per album, most recently added first).
  const covers = d3.groups(n.songs, s => s.album).map(([, v]) => v[v.length - 1]).reverse().filter(s => s.cover).slice(0, 18)
  const strip = info.append('div').style('display', 'flex').style('gap', '3px').style('margin-top', '6px')
  strip
    .selectAll('img')
    .data(covers)
    .join('img')
    .attr('src', s => s.cover)
    .attr('alt', '')
    .attr('title', s => `${s.title} — ${s.artist}`)
    .style('width', '30px')
    .style('height', '30px')
    .style('border-radius', '2px')
}

// ---- Chart ----------------------------------------------------------------------

const svg = container
  .append('svg')
  .attr('viewBox', [-width / 2, -height / 2, width, height])
  .attr('width', width)
  .attr('height', height)
  .attr('style', 'max-width: 100%; height: auto; display: block; background: white; font: 10px sans-serif;')

const linkLayer = svg.append('g').attr('fill', 'none')
const width_ = d3.scaleSqrt().domain([3, d3.max(allLinks, l => l.count)]).range([0.4, 7])

// Curved link: bends toward the center, more for genres far apart on the ring.
const linkPath = l => {
  const k = 0.25
  return `M${l.source.x},${l.source.y} Q${((l.source.x + l.target.x) / 2) * k},${((l.source.y + l.target.y) / 2) * k} ${l.target.x},${l.target.y}`
}

let links // the current <path> selection
function drawLinks() {
  sliderLabel.text(`Link genres that share at least ${minShared} songs (${allLinks.filter(l => l.count >= minShared).length} links)`)
  links = linkLayer
    .selectAll('path')
    .data(allLinks.filter(l => l.count >= minShared), l => l.source.genre + '|' + l.target.genre)
    .join('path')
    .attr('d', linkPath)
    .attr('stroke-width', l => width_(l.count))
  highlight(pinned)
}

// Genre dots, sized by number of songs.
const radius = d3.scaleSqrt().domain([minSongsPerGenre, d3.max(nodes, n => n.songs.length)]).range([2.5, 12])
const dots = svg
  .append('g')
  .selectAll('circle')
  .data(nodes)
  .join('circle')
  .attr('cx', n => n.x)
  .attr('cy', n => n.y)
  .attr('r', n => radius(n.songs.length))
  .attr('fill', n => color(n.family))
  .attr('stroke', 'white')
  .style('cursor', 'pointer')

// Genre names, pointing outward from the ring (flipped on the left side so they read left to right).
const labels = svg
  .append('g')
  .selectAll('text')
  .data(nodes)
  .join('text')
  .attr('transform', n => {
    const deg = (n.angle * 180) / Math.PI - 90
    const flip = n.angle > Math.PI
    return `rotate(${deg}) translate(${ringRadius + 16},0)${flip ? ' rotate(180)' : ''}`
  })
  .attr('text-anchor', n => (n.angle > Math.PI ? 'end' : 'start'))
  .attr('dy', '0.32em')
  .text(n => n.genre)
  .style('cursor', 'pointer')

// ---- Hover and click --------------------------------------------------------------

let pinned = null

function highlight(n) {
  if (!n) {
    links.attr('stroke', '#999').attr('stroke-opacity', 0.25)
    dots.attr('opacity', 1)
    labels.attr('fill', '#333').attr('font-weight', null).attr('opacity', 1)
    showInfo(null)
    return
  }
  const connected = new Set([n])
  links.each(l => {
    if (l.source === n) connected.add(l.target)
    if (l.target === n) connected.add(l.source)
  })
  links
    .attr('stroke', l => (l.source === n || l.target === n ? color(n.family) : '#999'))
    .attr('stroke-opacity', l => (l.source === n || l.target === n ? 0.85 : 0.04))
    .filter(l => l.source === n || l.target === n)
    .raise()
  dots.attr('opacity', d => (connected.has(d) ? 1 : 0.25))
  labels
    .attr('opacity', d => (connected.has(d) ? 1 : 0.25))
    .attr('font-weight', d => (d === n ? 'bold' : null))
    .attr('fill', d => (d === n ? '#000' : '#333'))
  showInfo(n)
}

for (const sel of [dots, labels]) {
  sel
    .on('mouseover', (event, n) => {
      if (!pinned) highlight(n)
    })
    .on('mouseout', () => {
      if (!pinned) highlight(null)
    })
    .on('click', (event, n) => {
      pinned = pinned === n ? null : n
      highlight(pinned ?? n)
      event.stopPropagation()
    })
}
svg.on('click', () => {
  pinned = null
  highlight(null)
})

// ---- Family legend -----------------------------------------------------------------

const legend = container
  .append('div')
  .style('display', 'flex')
  .style('flex-wrap', 'wrap')
  .style('gap', '4px 14px')
  .style('margin-top', '8px')
  .style('font', '12px sans-serif')
const item = legend
  .selectAll('div')
  .data(familiesShown)
  .join('div')
  .style('display', 'flex')
  .style('align-items', 'center')
  .style('gap', '5px')
item
  .append('span')
  .style('width', '12px')
  .style('height', '12px')
  .style('border-radius', '50%')
  .style('background', f => color(f))
item.append('span').text(f => {
  const count = nodes.filter(n => n.family === f).length
  return `${f} (${count} ${count === 1 ? 'genre' : 'genres'})`
})

drawLinks()
