import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the map dimensions. Tiles are pointy-top hexagons, like Civilization VI.
const width = 900
const height = 660
const r = 6 // hex radius (center to corner)
const hexW = Math.sqrt(3) * r
const rowH = 1.5 * r
const cols = Math.floor(width / hexW) - 1
const rows = Math.floor(height / rowH) - 1

const likedSongs = await d3.json('./assets/LikedSongs_enriched.json')

// Every song with a genre becomes one land tile.
const songs = likedSongs
  .filter(entry => entry.enrichment.genres.main)
  .map(entry => ({
    title: entry.track.name,
    artists: entry.track.artists.map(a => a.name),
    cover: [...entry.track.album.images].reverse().find(img => img.width >= 64)?.url,
    added: new Date(entry.added_at),
    family: entry.enrichment.genres.main,
    sub: entry.enrichment.genres.sub ?? entry.enrichment.genres.main,
    features: entry.enrichment.reccobeats
  }))

// ---- Terrain: each tile's terrain comes from its song's audio features -------------

const terrains = {
  mountains: { color: '#8c8c84', why: 'energy 0.85 or higher' },
  hills: { color: '#b39b62', why: 'energy 0.7–0.85' },
  forest: { color: '#3f6b33', why: 'acousticness 0.5 or higher' },
  grassland: { color: '#7fa94d', why: 'valence (happiness) 0.5 or higher' },
  tundra: { color: '#a3a89a', why: 'valence below 0.5 and energy below 0.5' },
  plains: { color: '#b9b062', why: 'everything else' },
  unknown: { color: '#cfc7a8', why: 'no audio data for this song' }
}
function terrainOf(f) {
  if (!f) return 'unknown'
  if (f.energy >= 0.85) return 'mountains'
  if (f.energy >= 0.7) return 'hills'
  if (f.acousticness >= 0.5) return 'forest'
  if (f.valence >= 0.5) return 'grassland'
  if (f.energy < 0.5) return 'tundra'
  return 'plains'
}

// ---- The hex grid ---------------------------------------------------------------

const tiles = []
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    tiles.push({ col, row, x: hexW * (col + 0.5 * (row & 1)) + hexW / 2 + 6, y: rowH * row + r + 4, nation: null })
  }
}
const tileAt = (col, row) => (col >= 0 && col < cols && row >= 0 && row < rows ? tiles[row * cols + col] : null)

// Neighbors in "odd-r" layout, in the same order as the hex's edges (E, SE, SW, W, NW, NE).
function neighbors(t) {
  const odd = t.row & 1
  const dirs = odd
    ? [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]
    : [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]]
  return dirs.map(([dc, dr]) => tileAt(t.col + dc, t.row + dr))
}
// Corner i of a pointy-top hex; edge i runs from corner i to corner i+1 and faces neighbors(t)[i].
const corner = (t, i) => [t.x + r * Math.cos((Math.PI / 180) * (60 * i - 30)), t.y + r * Math.sin((Math.PI / 180) * (60 * i - 30))]
const hexPath = t => 'M' + d3.range(6).map(i => corner(t, i).join(',')).join('L') + 'Z'

// ---- Nations: one per genre family, territory = number of songs ---------------------

const nations = d3
  .groups(songs, s => s.family)
  .map(([family, list]) => ({
    family,
    songs: list.sort((a, b) => a.added - b.added), // oldest first
    leader: d3.greatest(d3.rollups(list.flatMap(s => s.artists), v => v.length, a => a), ([, n]) => n),
    tiles: []
  }))
  .sort((a, b) => b.songs.length - a.songs.length)

// Same colors as the other genre charts.
const color = d3
  .scaleOrdinal()
  .domain(nations.map(n => n.family))
  .range(d3.schemeTableau10.concat(d3.schemeDark2.slice(0, 5)))

// Rough starting positions: pack one circle per nation (area ∝ songs), then scale the whole layout
// so each circle's area matches the land its songs need (one hex per song).
const packed = d3
  .pack()
  .size([height, height])
  .padding(2)(d3.hierarchy({ children: nations }).sum(n => n.songs?.length ?? 0))
const hexArea = (3 * Math.sqrt(3) / 2) * r * r
const scale = Math.sqrt((songs.length * hexArea) / d3.sum(packed.leaves(), l => Math.PI * l.r * l.r))
for (const leaf of packed.leaves()) {
  const n = leaf.data
  n.cx = width / 2 + (leaf.x - packed.x) * scale
  n.cy = height / 2 + (leaf.y - packed.y) * scale
  n.r = leaf.r * scale
}

// Smooth pseudo-random wobble so borders and coastlines aren't perfect circles.
const wobble = t => 1 + 0.07 * (Math.sin(t.x * 0.045) + Math.sin(t.y * 0.05 + 1.3) + Math.sin((t.x + t.y) * 0.03 + 2.1))

// Hand out tiles: every (tile, nation) pair is ranked by distance from that nation's center,
// relative to its size. Going down the list, a free tile goes to the nation if it still needs tiles.
// Nations end up with exactly one tile per song; unclaimed tiles become ocean.
const pairs = []
for (const t of tiles) {
  for (const n of nations) pairs.push({ t, n, score: (Math.hypot(t.x - n.cx, t.y - n.cy) / n.r) * wobble(t) })
}
pairs.sort((a, b) => a.score - b.score)
for (const { t, n } of pairs) {
  if (!t.nation && n.tiles.length < n.songs.length) {
    t.nation = n
    n.tiles.push(t) // in order of distance, so the first tile is the capital
  }
}

// Settle each nation's songs onto its tiles: oldest songs at the capital, newest on the frontier.
for (const n of nations) {
  n.tiles.forEach((t, i) => {
    t.song = n.songs[i]
    t.terrain = terrainOf(t.song.features)
  })
}

// ---- Cities: sub-genres, the biggest one is the capital ----------------------------------

for (const n of nations) {
  const subs = d3
    .rollups(n.songs, v => v.length, s => s.sub)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count], i) => i === 0 || count >= 10)
    .slice(0, 5)
  n.cities = []
  for (const [name, population] of subs) {
    let site
    if (!n.cities.length) {
      site = n.tiles[0]
    } else {
      // Found each new city as far as possible from the existing ones, but not right on the border.
      const inland = n.tiles.filter(t => neighbors(t).every(nb => nb && nb.nation === n))
      const candidates = inland.length ? inland : n.tiles
      site = d3.greatest(candidates, t => d3.min(n.cities, c => Math.hypot(t.x - c.tile.x, t.y - c.tile.y)))
    }
    n.cities.push({ name, population, tile: site, capital: !n.cities.length, nation: n })
  }
}

const container = d3.select('#container8')

// ---- Info bar -------------------------------------------------------------------------

const info = container
  .append('div')
  .style('min-height', '52px')
  .style('padding', '6px 12px')
  .style('display', 'flex')
  .style('align-items', 'center')
  .style('gap', '10px')
  .style('background', '#1d2b36')
  .style('color', '#e8e2c8')
  .style('font', '13px/1.4 sans-serif')

function showInfo(t) {
  info.html('')
  if (!t) {
    info.append('span').style('opacity', 0.8).text('Hover over a tile to see its song, or over a city banner to see the sub-genre.')
    return
  }
  if (t.city) {
    const c = t.city
    info.append('span').style('width', '14px').style('height', '14px').style('background', color(c.nation.family))
    info.append('strong').text(`${c.capital ? '★ ' : ''}${c.name}`)
    info.append('span').text(`${c.capital ? 'Capital' : 'City'} of ${c.nation.family} · population ${c.population} songs`)
    return
  }
  if (t.song.cover) info.append('img').attr('src', t.song.cover).attr('alt', '').style('width', '40px').style('height', '40px')
  const text = info.append('div')
  text.append('div').call(d => {
    d.append('strong').text(t.song.title)
    d.append('span').style('opacity', 0.75).text(` — ${t.song.artists.join(', ')}`)
  })
  const f = t.song.features
  const detail =
    t.terrain === 'unknown'
      ? 'no audio data'
      : `energy ${f.energy.toFixed(2)}, valence ${f.valence.toFixed(2)}, acousticness ${f.acousticness.toFixed(2)}`
  text
    .append('div')
    .style('opacity', 0.75)
    .style('font-size', '12px')
    .text(`${t.nation.family} · ${t.song.sub} · added ${d3.utcFormat('%b %Y')(t.song.added)} · ${t.terrain === 'unknown' ? 'plains' : t.terrain} (${detail})`)
}

// ---- Draw the map ----------------------------------------------------------------------

const svg = container
  .append('svg')
  .attr('viewBox', [0, 0, width, height])
  .attr('width', width)
  .attr('height', height)
  .attr('style', 'max-width: 100%; height: auto; display: block; background: #23557f; font: 10px sans-serif;')

// Ocean tiles: lighter "coast" next to land, deep water everywhere else.
const isCoast = t => !t.nation && neighbors(t).some(nb => nb?.nation)
svg
  .append('g')
  .selectAll('path')
  .data(tiles.filter(t => !t.nation))
  .join('path')
  .attr('d', hexPath)
  .attr('fill', t => (isCoast(t) ? '#4f8dbd' : '#2b5f8c'))
  .attr('stroke', '#ffffff')
  .attr('stroke-opacity', 0.06)

// Land tiles: terrain color with a light tint of the nation's color, like Civ's territory shading.
const land = svg
  .append('g')
  .selectAll('g')
  .data(tiles.filter(t => t.nation))
  .join('g')
land
  .append('path')
  .attr('d', hexPath)
  .attr('fill', t => terrains[t.terrain].color)
  .attr('stroke', '#000')
  .attr('stroke-opacity', 0.12)
land
  .append('path')
  .attr('d', hexPath)
  .attr('fill', t => color(t.nation.family))
  .attr('fill-opacity', 0.22)
  .attr('pointer-events', 'none')

// Little peaks on mountain tiles.
svg
  .append('g')
  .attr('pointer-events', 'none')
  .selectAll('path')
  .data(tiles.filter(t => t.terrain === 'mountains'))
  .join('path')
  .attr('d', t => `M${t.x - 3.5},${t.y + 2.5}L${t.x},${t.y - 3.5}L${t.x + 3.5},${t.y + 2.5}Z`)
  .attr('fill', '#5e5e58')

// National borders: every hex edge between two different nations (or a nation and the sea).
const borderEdges = d3.groups(
  tiles.filter(t => t.nation).flatMap(t =>
    neighbors(t)
      .map((nb, i) => (nb?.nation === t.nation ? null : { nation: t.nation, a: corner(t, i), b: corner(t, (i + 1) % 6) }))
      .filter(Boolean)
  ),
  e => e.nation
)
// Each border is drawn twice: a dark line underneath so every color stands out against the sea.
for (const [stroke, strokeWidth] of [
  [() => '#111', 4],
  [([n]) => color(n.family), 2.2]
]) {
  svg
    .append('g')
    .attr('pointer-events', 'none')
    .selectAll('path')
    .data(borderEdges)
    .join('path')
    .attr('d', ([, edges]) => edges.map(e => `M${e.a}L${e.b}`).join(''))
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-opacity', strokeWidth === 4 ? 0.55 : 1)
    .attr('stroke-width', strokeWidth)
    .attr('stroke-linecap', 'round')
}

// Hover highlight: one outline that jumps to the tile under the mouse.
const hover = svg
  .append('path')
  .attr('fill', 'none')
  .attr('stroke', '#fff')
  .attr('stroke-width', 2)
  .attr('pointer-events', 'none')
  .style('display', 'none')
land.on('mouseover', (event, t) => {
  hover.attr('d', hexPath(t)).style('display', null)
  showInfo(t)
})
svg.on('mouseleave', () => {
  hover.style('display', 'none')
  showInfo(null)
})

// City banners: a population box and the city's name, in the nation's color.
const cities = nations.flatMap(n => n.cities)
const banner = svg
  .append('g')
  .selectAll('g')
  .data(cities)
  .join('g')
  .attr('transform', c => `translate(${c.tile.x},${c.tile.y})`)
  .style('cursor', 'default')
  .on('mouseover', (event, c) => showInfo({ city: c }))
banner
  .append('circle')
  .attr('r', c => (c.capital ? 4.5 : 3.5))
  .attr('fill', '#f4efe0')
  .attr('stroke', '#222')
banner.each(function (c) {
  const g = d3.select(this)
  const label = `${c.capital ? '★ ' : ''}${c.name}`
  const text = g
    .append('text')
    .attr('x', 15)
    .attr('y', -9)
    .attr('fill', '#fff')
    .style('font-weight', c.capital ? 'bold' : null)
    .text(label)
  const w = text.node().getComputedTextLength()
  g.insert('rect', 'text')
    .attr('x', 0)
    .attr('y', -17)
    .attr('width', w + 19)
    .attr('height', 12)
    .attr('rx', 2)
    .attr('fill', color(c.nation.family))
    .attr('stroke', '#111')
    .attr('stroke-opacity', 0.6)
  g.insert('rect', 'text')
    .attr('x', 0)
    .attr('y', -17)
    .attr('width', 12)
    .attr('height', 12)
    .attr('rx', 2)
    .attr('fill', '#1d2b36')
  g.append('text')
    .attr('x', 6)
    .attr('y', -8)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .style('font-size', '8px')
    .text(c.population)
})

// ---- Legends: civilizations and terrain ---------------------------------------------------

const legends = container
  .append('div')
  .style('display', 'grid')
  .style('grid-template-columns', '1fr 220px')
  .style('gap', '16px')
  .style('margin-top', '10px')
  .style('font', '12px/1.5 sans-serif')

const civTable = legends.append('table').style('border-collapse', 'collapse').style('width', '100%')
civTable
  .append('tr')
  .selectAll('th')
  .data(['Civilization', 'Leader (most-liked artist)', 'Territory', 'Cities'])
  .join('th')
  .style('text-align', 'left')
  .style('padding', '2px 8px 2px 0')
  .style('border-bottom', '1px solid #ccc')
  .text(d => d)
const civRow = civTable.selectAll('tr.civ').data(nations).join('tr').attr('class', 'civ')
civRow
  .append('td')
  .style('padding', '1px 8px 1px 0')
  .call(td =>
    td
      .append('span')
      .style('display', 'inline-block')
      .style('width', '10px')
      .style('height', '10px')
      .style('margin-right', '6px')
      .style('background', n => color(n.family))
  )
  .append('span')
  .text(n => (n.songs.length < 20 ? `${n.family} (city-state)` : n.family))
civRow.append('td').style('padding-right', '8px').text(n => `${n.leader[0]} (${n.leader[1]} songs)`)
civRow.append('td').style('padding-right', '8px').text(n => `${n.songs.length} tiles`)
civRow.append('td').text(n => n.cities.length)

const terrainLegend = legends.append('div')
terrainLegend.append('div').style('font-weight', 'bold').text('Terrain (from each song’s audio features)')
const tRow = terrainLegend
  .selectAll('div.t')
  .data(Object.entries(terrains))
  .join('div')
  .attr('class', 't')
  .style('display', 'flex')
  .style('gap', '6px')
  .style('align-items', 'baseline')
tRow
  .append('span')
  .style('display', 'inline-block')
  .style('width', '10px')
  .style('height', '10px')
  .style('flex-shrink', '0')
  .style('background', ([, t]) => t.color)
tRow.append('span').text(([name, t]) => `${name === 'unknown' ? 'plains (no data)' : name}: ${t.why}`)

showInfo(null)
