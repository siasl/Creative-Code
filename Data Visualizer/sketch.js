import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart dimensions and margins.
const width = 640
const height = 400
const marginTop = 20
const marginRight = 20
const marginBottom = 30
const marginLeft = 40

const likedSongs = await d3.json('./assets/LikedSongs.json')
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
console.log(songs)
const yearCounts = d3.rollup(
  songs,
  group => group.length,
  d => d.added_at.getFullYear()
)
console.log(yearCounts)
const minMaxYearCounts = d3.extent(yearCounts.entries())
const highestYearCount = d3.max(yearCounts.values())
console.log(highestYearCount)
// Declare the x (horizontal position) scale.
const yearCountData = Array.from(yearCounts)
console.log(yearCountData)
const x = d3
  .scaleUtc()
  .domain([
    new Date(minMaxYearCounts[0][0], 0, 1),
    new Date(minMaxYearCounts[1][0] + 1, 0, 1)
  ])
  .range([marginLeft, width - marginRight])

// Declare the y (vertical position) scale.
const y = d3
  .scaleLinear()
  .domain([0, Math.round(highestYearCount / 50) * 50 + 50])
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
svg
  .append('g')
  .selectAll('rect')
  .data(yearCountData)
  .join('rect')
  .attr('x', d => x(new Date(d[0], 0, 1)))
  .attr('y', d => y(d[1]))
  .attr('width', 30)
  .attr('height', d => y(0) - y(d[1]))
// Append the SVG element.
const container = document.getElementById('container')
container.append(svg.node())
