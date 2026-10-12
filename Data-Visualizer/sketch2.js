import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

// Declare the chart dimensions and margins.
const width = 640
const height = 400
const marginTop = 20
const marginRight = 20
const marginBottom = 30
const marginLeft = 40

const vowels = ['a', 'e', 'i', 'o', 'u', 'Thai vowel']

// Vowels in other alphabets, mapped to the a/e/i/o/u sound they make.
const otherVowels = {
  // Ligatures and letters that don't break apart into a base letter + accent
  æ: 'ae', œ: 'oe', ø: 'o', ɵ: 'o',
  // Cyrillic
  а: 'a', я: 'a', е: 'e', ё: 'e', э: 'e', є: 'e', и: 'i', ы: 'i', і: 'i', ї: 'i', о: 'o', у: 'u', ю: 'u',
  // Greek
  α: 'a', ε: 'e', η: 'e', ι: 'i', ο: 'o', ω: 'o', υ: 'u'
}
// Japanese kana: every syllable ends in a vowel (サ = sa, ミ = mi, ...). Katakana by vowel sound;
// hiragana is converted to katakana first.
const kanaVowels = {
  a: 'アァカサタナハマヤャラワヵ',
  i: 'イィキシチニヒミリヰ',
  u: 'ウゥクスツヌフムユュルヴ',
  e: 'エェケセテネヘメレヱヶ',
  o: 'オォコソトノホモヨョロヲ'
}
const kanaToVowel = Object.fromEntries(Object.entries(kanaVowels).flatMap(([v, chars]) => [...chars].map(c => [c, v])))
// Thai vowel signs (written above, below, before or after a consonant)
const thaiVowel = /[\u0E30-\u0E39\u0E40-\u0E44\u0E47]/gu

// Count every vowel in a title, in any of the alphabets above.
function countVowels(title) {
  const counts = Object.fromEntries(vowels.map(v => [v, 0]))
  // Thai first: its vowel signs are "combining marks", which the next step removes.
  counts['Thai vowel'] = (title.match(thaiVowel) ?? []).length
  // Split accented letters into letter + accent and drop the accent (é → e, ä → a, ō → o, ガ → カ).
  // (Cyrillic й is a "y" consonant, but it would turn into и once its accent is removed, so drop it first.)
  const plain = title
    .replace(/[йЙ]/g, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  let lastKana = null // the vowel of the previous kana syllable
  for (let ch of plain) {
    // hiragana → katakana (they're 0x60 apart in Unicode)
    if (ch >= '\u3041' && ch <= '\u3096') ch = String.fromCharCode(ch.charCodeAt(0) + 0x60)
    // A small kana (ァ, ャ, ...) changes the vowel of the syllable before it (ヴ + ァ = "va"), so it replaces that vowel.
    if ('ァィゥェォャュョ'.includes(ch) && lastKana) {
      counts[lastKana] -= 1
      lastKana = null
    }
    const mapped = 'aeiou'.includes(ch) ? ch : otherVowels[ch] ?? kanaToVowel[ch] ?? ''
    for (const v of mapped) counts[v] += 1
    if (kanaToVowel[ch]) lastKana = kanaToVowel[ch]
    else if (ch !== 'ー') lastKana = null
  }
  return counts
}

const likedSongs = await d3.json('./assets/LikedSongs.json')
const songs = likedSongs.map(track => {
  const t = track.track
  return {
    album: t.album.name,
    artists: t.artists.map(a => a.name).join(', '),
    name: t.name,
    release_date: new Date(t.album.release_date),
    added_at: new Date(track.added_at),
    duration_ms: t.duration_ms,
    // How many times each vowel appears in the title, e.g. { a: 1, e: 2, i: 0, o: 1, u: 0, 'Thai vowel': 0 }
    vowel_counts: countVowels(t.name),
    song_name_vowels: d3.sum(Object.values(countVowels(t.name)))
  }
})
console.log(songs)

// Group songs by how many vowels their title has. For each group, keep the number of songs
// and how many of each vowel all of those titles contain together.
const groups = Array.from(
  d3.rollup(
    songs,
    group => ({
      songs: group.length,
      ...Object.fromEntries(vowels.map(v => [v, d3.sum(group, d => d.vowel_counts[v])]))
    }),
    d => d.song_name_vowels
  ),
  ([n, g]) => ({ n, ...g })
).sort((a, b) => a.n - b.n)
console.log(groups)
const highestCount = d3.max(groups, d => d.songs)
const mostVowels = d3.max(groups, d => d.n)

// Declare the x (horizontal position) scale: one band for every vowel count from 0 to the most,
// so counts that no title has (like 23) still get an empty slot.
const x = d3
  .scaleBand()
  .domain(d3.range(0, mostVowels + 1))
  .range([marginLeft, width - marginRight])
  .padding(0.15)

// Declare the y (vertical position) scale.
const y = d3
  .scaleLinear()
  .domain([0, highestCount])
  .nice()
  .range([height - marginBottom, marginTop])

// One color per vowel.
const color = d3.scaleOrdinal().domain(vowels).range(d3.schemeTableau10)

// Split each bar by vowel. A bar's height is still its number of songs; each vowel's slice is
// that vowel's share of all the vowels in those titles. Titles with no vowels get a plain gray bar.
const series = d3
  .stack()
  .keys(vowels)
  .value((d, v) => (d.n === 0 ? 0 : (d.songs * d[v]) / (d.n * d.songs)))(groups)

// Create the SVG container.
const svg = d3.create('svg').attr('width', width).attr('height', height)

// Add the x-axis (label every 5th count so they don't crowd).
svg
  .append('g')
  .attr('transform', `translate(0,${height - marginBottom})`)
  .call(d3.axisBottom(x).tickValues(x.domain().filter(n => n % 5 === 0)))

// Add the y-axis.
svg
  .append('g')
  .attr('transform', `translate(${marginLeft},0)`)
  .call(d3.axisLeft(y))

// Stacked bars, one layer per vowel.
svg
  .append('g')
  .selectAll('g')
  .data(series)
  .join('g')
  .attr('fill', d => color(d.key))
  .selectAll('rect')
  .data(layer => layer.map(seg => ({ vowel: layer.key, seg })))
  .join('rect')
  .attr('x', d => x(d.seg.data.n))
  .attr('y', d => y(d.seg[1]))
  .attr('height', d => y(d.seg[0]) - y(d.seg[1]))
  .attr('width', x.bandwidth())
  .append('title')
  .text(d => {
    const g = d.seg.data
    return `${g.songs} titles with ${g.n} vowels: ${d3.format('.0%')(g[d.vowel] / (g.n * g.songs))} of their vowels are ${d.vowel === 'Thai vowel' ? 'Thai vowel signs' : `"${d.vowel}"`}`
  })

// Titles with no vowels at all.
const none = groups.find(d => d.n === 0)
if (none) {
  svg
    .append('rect')
    .attr('x', x(0))
    .attr('y', y(none.songs))
    .attr('width', x.bandwidth())
    .attr('height', y(0) - y(none.songs))
    .attr('fill', '#bbb')
    .append('title')
    .text(`${none.songs} titles with no vowels`)
}

// Song count above each bar (skipped for very small bars so the labels don't pile up).
svg
  .append('g')
  .style('font', '10px sans-serif')
  .selectAll('text')
  .data(groups.filter(d => d.songs >= 5))
  .join('text')
  .attr('x', d => x(d.n) + x.bandwidth() / 2)
  .attr('y', d => y(d.songs) - 4)
  .attr('text-anchor', 'middle')
  .text(d => d.songs)

// Legend.
const legend = svg
  .append('g')
  .attr('transform', `translate(${width - marginRight - 300},${marginTop})`)
  .style('font', '12px sans-serif')
  .selectAll('g')
  .data([...vowels, 'no vowels'])
  .join('g')
  .attr('transform', (d, i) => `translate(${i < 5 ? i * 30 : 150 + (i - 5) * 82},0)`)
legend
  .append('rect')
  .attr('width', 10)
  .attr('height', 10)
  .attr('fill', d => (d === 'no vowels' ? '#bbb' : color(d)))
legend
  .append('text')
  .attr('x', 13)
  .attr('y', 9)
  .text(d => d)

// Append the SVG element.
const container = document.getElementById('container2')
container.append(svg.node())
