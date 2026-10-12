import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart dimensions and margins.
const width = 640
const height = 400
const marginTop = 30
const marginRight = 50
const marginBottom = 30
const marginLeft = 40

const likedSongs = await d3.json('./LikedSongs.json')
const songs = likedSongs.map(track => {
  const t = track.track
  return {
    album: t.album.name,
    artists: t.artists.map(a => a.name).join(', '),
    name: t.name,
    release_date: new Date(t.album.release_date),
    popularity: t.popularity,
    added_at: new Date(track.added_at),
    duration_ms: t.duration_ms
  }
})
// Count songs per calendar month. d3.utcMonth rounds a date down to the
// first day of its month, so every song added in the same month gets the same key.
const monthCounts = d3.rollup(
  songs,
  group => group.length,
  d => d3.utcMonth(d.added_at)
)
const monthCountData = Array.from(monthCounts).sort((a, b) => a[0] - b[0])
console.log(monthCountData)
const firstMonth = d3.min(monthCounts.keys())
const lastMonth = d3.max(monthCounts.keys())
const highestMonthCount = d3.max(monthCounts.values())

// Declare the x (horizontal position) scale.
const x = d3
  .scaleUtc()
  .domain([firstMonth, d3.utcMonth.offset(lastMonth, 1)])
  .range([marginLeft, width - marginRight])

// Declare the y (vertical position) scale.
const y = d3
  .scaleLinear()
  .domain([0, highestMonthCount])
  .nice()
  .range([height - marginBottom, marginTop])

// Create the SVG container.
const svg = d3.create('svg').attr('width', width).attr('height', height)

// Add the x-axis.
svg
  .append('g')
  .attr('transform', `translate(0,${height - marginBottom})`)
  .call(d3.axisBottom(x))

// Add the y-axis.
svg
  .append('g')
  .attr('transform', `translate(${marginLeft},0)`)
  .call(d3.axisLeft(y))

// One bar per month, spanning from the start of that month to the start of the next.
svg
  .append('g')
  .selectAll('rect')
  .data(monthCountData)
  .join('rect')
  .attr('x', d => x(d[0]) + 0.5)
  .attr('y', d => y(d[1]))
  .attr('width', d => Math.max(0, x(d3.utcMonth.offset(d[0], 1)) - x(d[0]) - 1))
  .attr('height', d => y(0) - y(d[1]))
  // Bars are too narrow for text labels, so show the count on hover instead.
  .append('title')
  .text(d => `${d3.utcFormat('%b %Y')(d[0])}: ${d[1]} songs`)

// Running total: how many songs were in the playlist at the end of each month.
// (This only counts songs that are still liked today; anything I un-liked isn't in the export.)
const runningTotal = d3.cumsum(monthCountData, d => d[1])
const totalData = monthCountData.map((d, i) => ({ month: d[0], total: runningTotal[i] }))

// A second y scale on the right for the running total, since it gets much bigger than any one month.
const yTotal = d3
  .scaleLinear()
  .domain([0, d3.max(totalData, d => d.total)])
  .nice()
  .range([height - marginBottom, marginTop])

svg
  .append('g')
  .attr('transform', `translate(${width - marginRight},0)`)
  .call(d3.axisRight(yTotal))
  .call(g => g.selectAll('text').attr('fill', '#e15759'))

// The line is drawn at the end of each month, when that month's songs have all been added.
svg
  .append('path')
  .datum(totalData)
  .attr('fill', 'none')
  .attr('stroke', '#e15759')
  .attr('stroke-width', 2)
  .attr(
    'd',
    d3
      .line()
      .x(d => x(d3.utcMonth.offset(d.month, 1)))
      .y(d => yTotal(d.total))
  )

// Invisible dots along the line so hovering shows the running total.
svg
  .append('g')
  .selectAll('circle')
  .data(totalData)
  .join('circle')
  .attr('cx', d => x(d3.utcMonth.offset(d.month, 1)))
  .attr('cy', d => yTotal(d.total))
  .attr('r', 4)
  .attr('fill', 'transparent')
  .append('title')
  .text(d => `End of ${d3.utcFormat('%b %Y')(d.month)}: ${d.total.toLocaleString()} songs in the playlist`)

// Legend.
const legend = svg.append('g').attr('transform', `translate(${marginLeft + 10},${marginTop - 18})`).style('font', '11px sans-serif')
legend.append('rect').attr('width', 10).attr('height', 10).attr('fill', 'black')
legend.append('text').attr('x', 14).attr('y', 9).text('Songs added that month (left axis)')
legend.append('line').attr('x1', 230).attr('x2', 246).attr('y1', 5).attr('y2', 5).attr('stroke', '#e15759').attr('stroke-width', 2)
legend.append('text').attr('x', 250).attr('y', 9).text('Total songs in playlist (right axis)')

// Append the SVG element.
const container = document.getElementById('container')
container.append(svg.node())
