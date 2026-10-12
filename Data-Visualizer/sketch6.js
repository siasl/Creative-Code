import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart dimensions and margins.
const width = 640
const height = 380
const marginTop = 10
const marginRight = 20
const marginBottom = 30
const marginLeft = 44

const likedSongs = await d3.json('./assets/LikedSongs_enriched.json')

// Each song's main genre family and the quarter (3-month period) it was added in.
const songs = likedSongs
  .filter(entry => entry.enrichment.genres.main)
  .map(entry => ({
    genre: entry.enrichment.genres.main,
    quarter: d3.utcMonth.every(3).floor(new Date(entry.added_at))
  }))

// The 8 biggest families get their own band; the rest are grouped as "other".
// Same order (and so the same colors) as the genre bubble chart.
const familySizes = d3.rollups(songs, v => v.length, d => d.genre).sort((a, b) => b[1] - a[1])
const keep = familySizes.slice(0, 8).map(([genre]) => genre)
const keys = [...keep, 'other']
const groupOf = d => (keep.includes(d.genre) ? d.genre : 'other')
const color = d3
  .scaleOrdinal()
  .domain(keys)
  .range(d3.schemeTableau10.slice(0, 8).concat('#cfcfcf'))

// One row per quarter with a count for every family (0 when none were added).
const quarters = d3.utcMonth.every(3).range(d3.min(songs, d => d.quarter), d3.utcMonth.offset(d3.max(songs, d => d.quarter), 1))
const counts = d3.rollup(songs, v => v.length, d => +d.quarter, groupOf)
const table = quarters.map(q => {
  const row = { quarter: q, total: 0 }
  for (const k of keys) {
    row[k] = counts.get(+q)?.get(k) ?? 0
    row.total += row[k]
  }
  return row
})

const quarterName = q => `Q${Math.floor(q.getUTCMonth() / 3) + 1} ${q.getUTCFullYear()}`

const container = d3.select('#container6')

// ---- Toggle: share of songs vs number of songs -------------------------------

let mode = 'share'
const toggle = container
  .append('div')
  .style('display', 'flex')
  .style('gap', '16px')
  .style('margin-bottom', '8px')
  .style('font', '13px sans-serif')
for (const [value, text] of [
  ['share', 'Share of songs added (%)'],
  ['count', 'Number of songs added']
]) {
  const option = toggle.append('label').style('cursor', 'pointer')
  option
    .append('input')
    .attr('type', 'radio')
    .attr('name', 'genre-time-mode')
    .property('checked', value === mode)
    .on('change', () => {
      mode = value
      update()
    })
  option.append('span').text(' ' + text)
}

// ---- Info bar: the breakdown for the quarter under the mouse -----------------

const info = container
  .append('div')
  .style('min-height', '44px')
  .style('padding', '6px 12px')
  .style('background', 'white')
  .style('border-bottom', '1px solid #e5e5e5')
  .style('font', '12px/1.5 sans-serif')
  .style('color', '#666')

function showInfo(row) {
  info.html('')
  if (!row) {
    info.text('Hover over the chart to see the genre mix for each quarter.')
    return
  }
  info.append('strong').style('color', '#222').text(`${quarterName(row.quarter)} · ${row.total} songs  `)
  for (const k of [...keys].sort((a, b) => row[b] - row[a]).filter(k => row[k] > 0)) {
    const item = info.append('span').style('margin-right', '10px').style('white-space', 'nowrap')
    item
      .append('span')
      .style('display', 'inline-block')
      .style('width', '9px')
      .style('height', '9px')
      .style('margin-right', '3px')
      .style('background', color(k))
    item.append('span').text(`${k} ${d3.format('.0%')(row[k] / row.total)}`)
  }
}

// ---- Chart --------------------------------------------------------------------

const x = d3
  .scaleUtc()
  .domain(d3.extent(quarters))
  .range([marginLeft, width - marginRight])
const y = d3.scaleLinear().range([height - marginBottom, marginTop])

const svg = container
  .append('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('style', 'display: block; background: white; font: 10px sans-serif;')

const xAxis = svg.append('g').attr('transform', `translate(0,${height - marginBottom})`).call(d3.axisBottom(x))
const yAxis = svg.append('g').attr('transform', `translate(${marginLeft},0)`)
const layers = svg.append('g')

// A vertical guide line that follows the mouse.
const guide = svg
  .append('line')
  .attr('y1', marginTop)
  .attr('y2', height - marginBottom)
  .attr('stroke', '#000')
  .attr('stroke-opacity', 0.5)
  .style('display', 'none')

svg
  .on('mousemove', event => {
    const [mx] = d3.pointer(event)
    const i = d3.minIndex(quarters, q => Math.abs(x(q) - mx))
    guide.attr('x1', x(quarters[i])).attr('x2', x(quarters[i])).style('display', null)
    showInfo(table[i])
  })
  .on('mouseleave', () => {
    guide.style('display', 'none')
    showInfo(null)
  })

// Legend.
const legend = container
  .append('div')
  .style('display', 'flex')
  .style('flex-wrap', 'wrap')
  .style('gap', '4px 14px')
  .style('margin-top', '8px')
  .style('font', '12px sans-serif')
const item = legend.selectAll('div').data(keys).join('div').style('display', 'flex').style('align-items', 'center').style('gap', '5px')
item.append('span').style('width', '12px').style('height', '12px').style('background', d => color(d))
item.append('span').text(d => (d === 'other' ? 'other (latin, blues, reggae, world, …)' : d))

function update() {
  // Stack the families on top of each other; "share" stretches every quarter to 100%.
  const series = d3
    .stack()
    .keys(keys)
    .offset(mode === 'share' ? d3.stackOffsetExpand : d3.stackOffsetNone)(table)

  y.domain(mode === 'share' ? [0, 1] : [0, d3.max(table, d => d.total)]).nice()
  yAxis
    .transition()
    .duration(600)
    .call(mode === 'share' ? d3.axisLeft(y).ticks(5, '%') : d3.axisLeft(y).ticks(6))

  const area = d3
    .area()
    .x(d => x(d.data.quarter))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX)

  layers
    .selectAll('path')
    .data(series, d => d.key)
    .join('path')
    .attr('fill', d => color(d.key))
    .transition()
    .duration(600)
    .attr('d', area)
}

showInfo(null)
update()
