import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart dimensions.
const width = 640
const height = 640

const likedSongs = await d3.json('./assets/LikedSongs_enriched.json')

// Build a three-level hierarchy: genre family → sub-genre → song.
// Songs with no genre (and the one blank track Spotify removed) are skipped.
const grouped = d3.group(
  likedSongs.filter(entry => entry.enrichment.genres.main),
  entry => entry.enrichment.genres.main,
  // Songs whose only genre is Deezer's vague "Alternative" have no sub-genre, so reuse the family name.
  entry => entry.enrichment.genres.sub ?? entry.enrichment.genres.main
)
const data = {
  name: 'All genres',
  children: Array.from(grouped, ([main, subs]) => ({
    name: main,
    children: Array.from(subs, ([sub, entries]) => ({
      name: sub,
      children: entries.map(entry => ({
        name: entry.track.name,
        artist: entry.track.artists.map(a => a.name).join(', '),
        // Spotify gives each album cover in several sizes (largest first); use the smallest one that's
        // still sharp at 36px on high-resolution screens, i.e. at least 72px wide.
        cover: [...entry.track.album.images].reverse().find(img => img.width >= 72)?.url,
        value: 1
      }))
    }))
  }))
}

// Pack the circles: each song counts as 1, so a bubble's area is proportional to its number of songs.
const root = d3
  .pack()
  .size([width, height])
  .padding(3)(
  d3
    .hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value)
)

// Color by genre family (biggest first); sub-genres are a lighter tint, songs are white.
const families = root.children.map(d => d.data.name)
const color = d3
  .scaleOrdinal()
  .domain(families)
  .range(d3.schemeTableau10.concat(d3.schemeDark2.slice(0, 5)))
const familyOf = d => d.ancestors().find(a => a.depth === 1)
const fill = d => {
  if (d.depth === 1) return color(d.data.name)
  if (d.depth === 2) return d3.interpolateRgb(color(familyOf(d).data.name), 'white')(0.45)
  return 'white'
}

// Create the SVG container, centered on (0, 0) so zooming is easy.
const svg = d3
  .create('svg')
  .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
  .attr('width', width)
  .attr('height', height)
  .attr('style', `max-width: 100%; height: auto; display: block; background: white; cursor: pointer;`)

// One circle for every family, sub-genre and song.
const node = svg
  .append('g')
  .selectAll('circle')
  .data(root.descendants().slice(1))
  .join('circle')
  .attr('fill', fill)
  .attr('stroke', d => (d.children ? null : '#bbb'))
  .on('mouseover', function (event, d) {
    d3.select(this).attr('stroke', '#000')
    showInfo(d)
  })
  .on('mouseout', function (event, d) {
    d3.select(this).attr('stroke', d.children ? null : '#bbb')
    showInfo(focus)
  })
  // Clicking a family or sub-genre zooms into it; clicking a song zooms to its sub-genre.
  .on('click', (event, d) => {
    const target = d.children ? d : d.parent
    if (focus !== target) {
      zoom(event, target)
      event.stopPropagation()
    }
  })

// Labels: only the children of the current focus are shown.
const label = svg
  .append('g')
  .style('font', '11px sans-serif')
  .attr('pointer-events', 'none')
  .attr('text-anchor', 'middle')
  .selectAll('text')
  .data(root.descendants())
  .join('text')
  // A white outline behind the letters keeps labels readable on any color.
  .attr('stroke', 'white')
  .attr('stroke-width', 3)
  .attr('paint-order', 'stroke')

// Fit a label inside its circle at the zoom level of a given focus:
// shorten it with "…" if needed, or hide it (null) if the circle is too small. Hovering shows the full name in the info bar.
function labelText(d, focus) {
  const radius = d.r * (width / (focus.r * 2)) // on-screen radius
  const maxChars = Math.floor((radius * 2) / 6)
  if (maxChars < 4) return null
  const withCount = d.children ? `${d.data.name} (${d.value})` : d.data.name
  if (withCount.length <= maxChars) return withCount
  // Too long: drop the count first, then shorten the name.
  const name = d.data.name
  return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name
}
// Songs never get a label on their bubble; hovering one shows its name in the info bar instead.
const shows = (d, focus) => d.children && d.parent === focus && labelText(d, focus) !== null

label
  .text(d => labelText(d, root) ?? '')
  .style('fill-opacity', d => (shows(d, root) ? 1 : 0))
  .style('display', d => (shows(d, root) ? 'inline' : 'none'))

// Clicking the background zooms back out one level.
svg.on('click', event => zoom(event, focus.parent ?? root))

let focus = root
let view
zoomTo([focus.x, focus.y, focus.r * 2])

// Position everything for a view [centerX, centerY, diameter].
function zoomTo(v) {
  const k = width / v[2]
  view = v
  label.attr('transform', d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
  node.attr('transform', d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`)
  node.attr('r', d => d.r * k)
}

// Animate the zoom to a new focus and swap which labels are visible.
function zoom(event, d) {
  focus = d
  showInfo(focus)

  const transition = svg
    .transition()
    .duration(750)
    .tween('zoom', () => {
      const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2])
      return t => zoomTo(i(t))
    })

  // Stop any label fades still running from a previous click, so a quick second click can't leave labels stuck.
  label.interrupt()

  // Turn on the new focus's labels right away (they start transparent and fade in below).
  label.each(function (d) {
    if (shows(d, focus)) {
      this.textContent = labelText(d, focus)
      this.style.display = 'inline'
    }
  })

  // Fade the new labels in and the old ones out, then remove the old ones once they're invisible.
  label
    .filter(function () {
      return this.style.display === 'inline'
    })
    .transition(transition)
    .style('fill-opacity', d => (shows(d, focus) ? 1 : 0))
    .on('end', function (d) {
      if (!shows(d, focus)) this.style.display = 'none'
    })
}

// An info bar above the chart. It names whatever bubble you're hovering over,
// and otherwise shows where you are (e.g. "rock › indie rock · 315 songs").
const info = d3
  .create('div')
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
  if (!d.children) {
    // A song: album cover (if Spotify has one), title in bold, then the artist.
    if (d.data.cover) {
      info
        .append('img')
        .attr('src', d.data.cover)
        .attr('alt', '')
        .style('width', '36px')
        .style('height', '36px')
        .style('border-radius', '3px')
        .style('flex-shrink', '0')
    }
    info.append('strong').text(d.data.name).style('overflow', 'hidden').style('text-overflow', 'ellipsis')
    info.append('span').text(d.data.artist).style('color', '#666').style('overflow', 'hidden').style('text-overflow', 'ellipsis')
    return
  }
  // A genre (or the whole chart): its path from the top, plus a song count and a hint.
  const path = d.ancestors().reverse().slice(1).map(a => a.data.name).join(' › ') || 'All genres'
  info.append('strong').text(path)
  info.append('span').text(`· ${d.value.toLocaleString()} songs`).style('color', '#666')
  const hint = d === focus ? (d.depth === 2 ? 'Hover over a song to see its name' : 'Click a bubble to zoom in') : ''
  if (hint) info.append('span').text(hint).style('margin-left', 'auto').style('color', '#999').style('font-size', '12px')
}

// A legend listing each genre family with its color and total songs.
const legend = d3
  .create('div')
  .style('display', 'flex')
  .style('flex-wrap', 'wrap')
  .style('gap', '4px 14px')
  .style('max-width', `${width}px`)
  .style('margin-top', '8px')
  .style('font', '12px sans-serif')

const item = legend
  .selectAll('div')
  .data(root.children)
  .join('div')
  .style('display', 'flex')
  .style('align-items', 'center')
  .style('gap', '5px')

item
  .append('span')
  .style('width', '12px')
  .style('height', '12px')
  .style('border-radius', '50%')
  .style('background', d => color(d.data.name))

item.append('span').text(d => `${d.data.name} (${d.value})`)

// Append the chart and legend.
const container = document.getElementById('container4')
showInfo(root)
container.append(info.node(), svg.node(), legend.node())
