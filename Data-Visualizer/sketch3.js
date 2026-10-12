import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the dimensions and margins of each small chart.
const width = 310
const height = 170
const marginTop = 28
const marginRight = 14
const marginBottom = 24
const marginLeft = 44

// The audio features to chart, with a readable label and a plain-language explanation for each.
// The definitions follow Spotify's original audio-features documentation, which ReccoBeats mirrors.
const features = [
  {
    key: 'danceability',
    label: 'Danceability (0–1)',
    about: 'How suitable a song is for dancing, based on tempo, how steady the rhythm is, and how strong the beat is. 1 is the most danceable.'
  },
  {
    key: 'energy',
    label: 'Energy (0–1)',
    about: 'How intense and active a song feels. Fast, loud, noisy songs (like punk) score high; quiet, gentle ones (like a solo piano piece) score low.'
  },
  {
    key: 'speechiness',
    label: 'Speechiness (0–1)',
    about: 'How much of a song is spoken words. Above 0.66 is mostly talking (podcasts, poetry); 0.33–0.66 mixes music and speech, as in a lot of rap; below 0.33 is mostly music.'
  },
  {
    key: 'acousticness',
    label: 'Acousticness (0–1)',
    about: 'How confident the model is that a song is acoustic (unplugged instruments) rather than electric or electronic. 1 means very likely acoustic.'
  },
  {
    key: 'liveness',
    label: 'Liveness (0–1)',
    about: 'How likely it is that a live audience can be heard in the recording. Above 0.8 usually means a live recording.'
  },
  {
    key: 'loudness',
    label: 'Loudness (dB)',
    about: 'The average volume of the whole song in decibels, usually between −60 and 0. Closer to 0 is louder, so −6 is louder than −8.'
  },
  {
    key: 'tempo',
    label: 'Tempo (BPM)',
    about: 'The estimated speed in beats per minute. The rise since 2020 holds up: it shows in medians as well as averages, I added far fewer songs under 90 BPM after 2023, and it happens partly because I added less (slower) hip hop and more (faster) electronic music, and partly because the rock I added got faster too (about 113 → 130 BPM). It is gradual, though. The y-axis is zoomed in, and 2026 is a partial year with less coverage.'
  }
]

const likedSongs = await d3.json('./assets/LikedSongs_enriched.json')
const songs = likedSongs.map(entry => {
  const t = entry.track
  const rb = entry.enrichment.reccobeats // null when ReccoBeats didn't recognize the song
  return {
    name: t.name,
    artists: t.artists.map(a => a.name).join(', '),
    added_at: new Date(entry.added_at),
    danceability: rb?.danceability,
    energy: rb?.energy,
    speechiness: rb?.speechiness,
    acousticness: rb?.acousticness,
    liveness: rb?.liveness,
    loudness: rb?.loudness,
    tempo: rb?.tempo
  }
})

// Only songs that have audio features can be averaged.
const songsWithFeatures = songs.filter(d => d.danceability != null)
console.log(`${songsWithFeatures.length} of ${songs.length} songs have audio features`)

// Group songs by the year they were added, and average every feature within each year.
const yearlyAverages = Array.from(
  d3.rollup(
    songsWithFeatures,
    group => {
      const averages = { count: group.length }
      for (const f of features) averages[f.key] = d3.mean(group, d => d[f.key])
      return averages
    },
    d => d.added_at.getUTCFullYear()
  ),
  ([year, averages]) => ({ year, ...averages })
).sort((a, b) => a.year - b.year)
console.log(yearlyAverages)

// Every chart shares the same x (horizontal position) scale: one point per year.
const x = d3
  .scaleLinear()
  .domain(d3.extent(yearlyAverages, d => d.year))
  .range([marginLeft, width - marginRight])

// A note on where the data comes from and which songs are missing it.
const allByYear = d3.rollup(songs, v => v.length, d => d.added_at.getUTCFullYear())
const coverage = yearlyAverages.map(d => `${d.year}: ${d.count}/${allByYear.get(d.year)}`).join(' · ')
const note = document.createElement('div')
note.style.cssText = 'font: 13px/1.5 sans-serif; color: #444; margin-bottom: 12px;'
note.innerHTML = `
  <p><strong>Where this comes from:</strong> ReccoBeats, a free music API that estimates Spotify-style audio
  features from the audio itself. Spotify stopped giving these to new apps in November 2024. Each song was matched
  by its exact Spotify ID, and every value is ReccoBeats' estimate.</p>
  <p style="margin-top: 6px;"><strong>Missing songs:</strong> ReccoBeats recognized ${songsWithFeatures.length.toLocaleString()} of
  ${songs.length.toLocaleString()} songs (${d3.format('.0%')(songsWithFeatures.length / songs.length)}); the averages only use those.
  Newer releases are missing most often: ReccoBeats lacks about 59% of songs released in 2024 or later, compared with
  about 23% of older ones. Songs whose only genre is Deezer's "Alternative" (often obscure artists) are missing 45% of the time.
  The full list is in <code>assets/missing_data.csv</code>.</p>
  <p style="margin-top: 6px; color: #666;">Songs with data / songs added, by year: ${coverage}</p>`

// Lay the small charts out in a two-column grid.
const grid = document.createElement('div')
grid.style.display = 'grid'
grid.style.gridTemplateColumns = `repeat(2, ${width}px)`
grid.style.gap = '12px'

for (const f of features) {
  // Each chart gets its own y (vertical position) scale, because the features use different units.
  const y = d3
    .scaleLinear()
    .domain(d3.extent(yearlyAverages, d => d[f.key]))
    .nice()
    .range([height - marginBottom, marginTop])

  // Create the SVG container.
  const svg = d3.create('svg').attr('width', width).attr('height', height)

  // Chart title.
  svg
    .append('text')
    .attr('x', marginLeft)
    .attr('y', 16)
    .attr('font-size', 13)
    .attr('font-weight', 'bold')
    .text(f.label)

  // Add the x-axis.
  svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).ticks(yearlyAverages.length).tickFormat(d3.format('d')))

  // Add the y-axis.
  svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(4))

  // The line connecting each year's average.
  const line = d3
    .line()
    .x(d => x(d.year))
    .y(d => y(d[f.key]))

  svg
    .append('path')
    .datum(yearlyAverages)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2)
    .attr('d', line)

  // A dot on each year, with the exact value on hover.
  svg
    .append('g')
    .selectAll('circle')
    .data(yearlyAverages)
    .join('circle')
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d[f.key]))
    .attr('r', 3)
    .attr('fill', 'steelblue')
    .append('title')
    .text(d => `${d.year}: ${d3.format('.3~f')(d[f.key])} (average of ${d.count} songs)`)

  // Each chart sits above a short explanation of what it measures.
  const panel = document.createElement('div')
  const about = document.createElement('p')
  about.textContent = f.about
  about.style.cssText = 'font: 12px/1.45 sans-serif; color: #555; margin: 2px 4px 0 8px;'
  panel.append(svg.node(), about)
  grid.append(panel)
}

// Append the charts.
const container = document.getElementById('container3')
container.append(note, grid)
