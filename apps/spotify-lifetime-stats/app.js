const state = {
  imports: [],
  plays: [],
  stats: buildEmptyStats(),
  activeTab: 'tracks'
};

const $ = (selector) => document.querySelector(selector);
const fmt = new Intl.NumberFormat();
const decoder = new TextDecoder('utf-8');

const hours = (ms) => `${fmt.format(Math.round((Number(ms) || 0) / 3600000))}h`;
const minutes = (ms) => `${fmt.format(Math.round((Number(ms) || 0) / 60000))}m`;
const date = (value) => value ? new Date(value).toLocaleDateString() : 'n/a';

bindEvents();
renderAll();

function bindEvents() {
  $('#chooseFiles').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (event) => importFiles([...event.target.files]));
  $('#loadDemo').addEventListener('click', loadDemo);
  $('#clearData').addEventListener('click', clearData);

  const dropZone = $('#dropZone');
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    importFiles([...event.dataTransfer.files]);
  });

  document.querySelectorAll('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab === button));
      renderTable();
    });
  });

  document.querySelectorAll('[data-export]').forEach((button) => {
    button.addEventListener('click', () => exportCsv(button.dataset.export));
  });
}

async function loadDemo() {
  setStatus('Loading sample listening history...');
  const response = await fetch('sample-history.json');
  const text = await response.text();
  await importJsonEntries([{ name: 'sample-history.json', text }], 'sample-history.json');
  renderAll();
}

function clearData() {
  state.imports = [];
  state.plays = [];
  state.stats = buildEmptyStats();
  $('#fileInput').value = '';
  setStatus('No listening history loaded yet.');
  renderAll();
}

async function importFiles(files) {
  if (!files.length) return;
  setStatus(`Reading ${files.length} file(s)...`);
  try {
    for (const file of files) {
      const entries = await extractFile(file);
      await importJsonEntries(entries, file.name);
    }
    state.stats = computeStats(state.plays, state.imports);
    renderAll();
    setStatus(`Loaded ${fmt.format(state.plays.length)} unique plays from ${state.imports.length} JSON file(s).`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Unable to read this export.');
  } finally {
    $('#fileInput').value = '';
  }
}

async function extractFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const looksZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (file.name.toLowerCase().endsWith('.zip') || looksZip) return readZipEntries(bytes);
  return [{ name: file.name, text: decoder.decode(bytes) }];
}

async function readZipEntries(bytes) {
  const eocd = findEndOfCentralDirectory(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const entries = [];
  let offset = centralOffset;
  const end = centralOffset + centralSize;

  while (offset < end) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    offset = nameStart + nameLength + extraLength + commentLength;

    if (name.endsWith('/') || !name.toLowerCase().endsWith('.json')) continue;
    entries.push({ name, text: await inflateZipEntry(bytes, localOffset, compressedSize, method) });
  }

  if (!entries.length) throw new Error('No JSON files were found inside this ZIP.');
  return entries;
}

function findEndOfCentralDirectory(bytes) {
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i -= 1) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  throw new Error('This does not look like a readable ZIP file.');
}

async function inflateZipEntry(bytes, localOffset, compressedSize, method) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('ZIP local file header is invalid.');
  const localNameLength = view.getUint16(localOffset + 26, true);
  const localExtraLength = view.getUint16(localOffset + 28, true);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const payload = bytes.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return decoder.decode(payload);
  if (method !== 8) throw new Error('Unsupported ZIP compression method: ' + method);
  if (!('DecompressionStream' in window)) throw new Error('This browser cannot decompress ZIP files. Try Chrome, Edge, or the desktop app.');

  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return decoder.decode(await new Response(stream).arrayBuffer());
}

async function importJsonEntries(entries, sourceName) {
  const seen = new Set(state.plays.map((play) => play.record_key));
  let inserted = 0;
  let duplicates = 0;

  for (const entry of entries) {
    const parsed = JSON.parse(entry.text.replace(/^\uFEFF/, ''));
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
    let recordsInserted = 0;
    let recordsDuplicate = 0;
    for (const raw of records) {
      const play = normalizePlay(raw);
      if (!play.played_at) continue;
      if (seen.has(play.record_key)) {
        duplicates += 1;
        recordsDuplicate += 1;
        continue;
      }
      seen.add(play.record_key);
      state.plays.push(play);
      inserted += 1;
      recordsInserted += 1;
    }
    state.imports.unshift({
      source_file: entry.name,
      import_source: sourceName,
      imported_at: new Date().toISOString(),
      record_count: records.length,
      records_inserted: recordsInserted,
      duplicate_records: recordsDuplicate
    });
  }

  state.stats = computeStats(state.plays, state.imports);
  setStatus(`Imported ${fmt.format(inserted)} new records. ${fmt.format(duplicates)} duplicates skipped.`);
}

function normalizePlay(raw) {
  const playedAt = normalizeTimestamp(raw.ts || raw.endTime || raw.played_at);
  const trackName = clean(raw.master_metadata_track_name || raw.trackName || raw.track_name);
  const artistName = clean(raw.master_metadata_album_artist_name || raw.artistName || raw.artist_name);
  const albumName = clean(raw.master_metadata_album_album_name || raw.albumName || raw.album_name);
  const episodeName = clean(raw.episode_name || raw.episodeName);
  const showName = clean(raw.episode_show_name || raw.episodeShowName || raw.show_name);
  const spotifyUri = clean(raw.spotify_track_uri || raw.spotify_episode_uri || raw.spotify_uri);
  const mediaType = episodeName || showName || spotifyUri?.startsWith('spotify:episode:') ? 'podcast' : 'music';
  const msPlayed = Math.max(0, Math.round(Number(raw.ms_played ?? raw.msPlayed ?? raw.ms ?? 0) || 0));
  const skipped = Boolean(raw.skipped ?? raw.skip ?? (raw.reason_end === 'fwdbtn') ?? false);
  const recordKey = stableKey([playedAt, msPlayed, mediaType, trackName, artistName, albumName, episodeName, showName, spotifyUri]);

  return {
    record_key: recordKey,
    played_at: playedAt,
    ms_played: msPlayed,
    media_type: mediaType,
    track_name: trackName,
    artist_name: artistName,
    album_name: albumName,
    episode_name: episodeName,
    show_name: showName,
    spotify_uri: spotifyUri,
    platform: clean(raw.platform),
    country: clean(raw.conn_country || raw.country),
    reason_start: clean(raw.reason_start),
    reason_end: clean(raw.reason_end),
    shuffle: raw.shuffle,
    skipped,
    offline: raw.offline,
    incognito_mode: raw.incognito_mode
  };
}

function computeStats(plays, imports) {
  const topTracks = new Map();
  const topArtists = new Map();
  const topAlbums = new Map();
  const topShows = new Map();
  const topEpisodes = new Map();
  const timeline = new Map();
  const hourly = new Map();
  const weekday = new Map();
  const dayMap = new Map();
  const distinct = {
    songs: new Set(),
    artists: new Set(),
    albums: new Set(),
    shows: new Set(),
    episodes: new Set()
  };

  let totalMs = 0;
  let musicPlays = 0;
  let podcastPlays = 0;
  let skippedPlays = 0;
  let firstPlayed = null;
  let lastPlayed = null;

  for (const play of plays) {
    totalMs += play.ms_played;
    firstPlayed = minDate(firstPlayed, play.played_at);
    lastPlayed = maxDate(lastPlayed, play.played_at);
    if (play.skipped || play.ms_played <= 30000) skippedPlays += 1;

    bump(timeline, play.played_at.slice(0, 7), { period: play.played_at.slice(0, 7), ms: 0, plays: 0 }, play);
    const playedDate = new Date(play.played_at);
    const hour = playedDate.getUTCHours();
    const week = playedDate.getUTCDay();
    bump(hourly, hour, { hour, ms: 0, plays: 0 }, play);
    bump(weekday, week, { weekday: week, ms: 0, plays: 0 }, play);
    bump(dayMap, play.played_at.slice(0, 10), { day: play.played_at.slice(0, 10), ms: 0, plays: 0 }, play);

    if (play.media_type === 'podcast') {
      podcastPlays += 1;
      if (play.show_name) {
        distinct.shows.add(play.show_name);
        bump(topShows, play.show_name, { show_name: play.show_name, plays: 0, ms: 0, first_played: play.played_at, last_played: play.played_at }, play);
      }
      if (play.episode_name) {
        distinct.episodes.add(play.episode_name);
        bump(topEpisodes, `${play.episode_name}|${play.show_name || ''}`, { episode_name: play.episode_name, show_name: play.show_name, plays: 0, ms: 0 }, play);
      }
    } else {
      musicPlays += 1;
      if (play.track_name) {
        distinct.songs.add(`${play.track_name}|${play.artist_name || ''}`);
        bump(topTracks, `${play.track_name}|${play.artist_name || ''}|${play.album_name || ''}`, {
          track_name: play.track_name,
          artist_name: play.artist_name,
          album_name: play.album_name,
          plays: 0,
          ms: 0,
          first_played: play.played_at,
          last_played: play.played_at
        }, play);
      }
      if (play.artist_name) {
        distinct.artists.add(play.artist_name);
        bump(topArtists, play.artist_name, { artist_name: play.artist_name, plays: 0, ms: 0, first_played: play.played_at, last_played: play.played_at }, play);
      }
      if (play.album_name) {
        distinct.albums.add(`${play.album_name}|${play.artist_name || ''}`);
        bump(topAlbums, `${play.album_name}|${play.artist_name || ''}`, { album_name: play.album_name, artist_name: play.artist_name, plays: 0, ms: 0 }, play);
      }
    }
  }

  const byMs = (a, b) => b.ms - a.ms;
  return {
    overview: {
      total_plays: plays.length,
      total_ms: totalMs,
      total_hours: Math.round((totalMs / 3600000) * 100) / 100,
      music_plays: musicPlays,
      podcast_plays: podcastPlays,
      skipped_plays: skippedPlays,
      skip_rate: plays.length ? Math.round((skippedPlays / plays.length) * 1000) / 10 : 0,
      first_played: firstPlayed,
      last_played: lastPlayed,
      songs: distinct.songs.size,
      artists: distinct.artists.size,
      albums: distinct.albums.size,
      shows: distinct.shows.size,
      episodes: distinct.episodes.size
    },
    imports,
    topTracks: [...topTracks.values()].sort(byMs).slice(0, 100),
    topArtists: [...topArtists.values()].sort(byMs).slice(0, 100),
    topAlbums: [...topAlbums.values()].sort(byMs).slice(0, 100),
    topShows: [...topShows.values()].sort(byMs).slice(0, 100),
    topEpisodes: [...topEpisodes.values()].sort(byMs).slice(0, 100),
    timeline: [...timeline.values()].sort((a, b) => a.period.localeCompare(b.period)),
    hourly: Array.from({ length: 24 }, (_, hour) => hourly.get(hour) || { hour, ms: 0, plays: 0 }),
    weekday: Array.from({ length: 7 }, (_, day) => weekday.get(day) || { weekday: day, ms: 0, plays: 0 }),
    streaks: getStreaks([...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day))),
    plays
  };
}

function bump(map, key, seed, play) {
  const row = map.get(key) || { ...seed };
  row.plays += 1;
  row.ms += play.ms_played || 0;
  if ('first_played' in row) row.first_played = minDate(row.first_played, play.played_at);
  if ('last_played' in row) row.last_played = maxDate(row.last_played, play.played_at);
  map.set(key, row);
}

function getStreaks(days) {
  let best = { start: null, end: null, days: 0 };
  let current = { start: null, end: null, days: 0 };
  let previous = null;
  for (const row of days) {
    const currentDate = new Date(`${row.day}T00:00:00Z`);
    if (!previous || currentDate - previous === 86400000) {
      current = { start: current.start || row.day, end: row.day, days: current.days + 1 };
    } else {
      current = { start: row.day, end: row.day, days: 1 };
    }
    if (current.days > best.days) best = { ...current };
    previous = currentDate;
  }
  return { longest: best, biggestDays: [...days].sort((a, b) => b.ms - a.ms).slice(0, 10) };
}

function renderAll() {
  renderOverview();
  renderCharts();
  renderLists();
  renderTable();
  document.querySelectorAll('[data-export]').forEach((button) => {
    button.disabled = !state.plays.length;
  });
}

function renderOverview() {
  const o = state.stats.overview;
  const cards = [
    ['Total Hours', fmt.format(o.total_hours || 0), 'All music and podcasts'],
    ['Total Plays', fmt.format(o.total_plays || 0), `${fmt.format(o.music_plays || 0)} music / ${fmt.format(o.podcast_plays || 0)} podcast`],
    ['Songs', fmt.format(o.songs || 0), 'Distinct song + artist pairs'],
    ['Artists', fmt.format(o.artists || 0), 'Music artists'],
    ['Shows', fmt.format(o.shows || 0), 'Podcast shows'],
    ['Skip Rate', `${o.skip_rate || 0}%`, 'Skip flag or <= 30 seconds']
  ];
  $('#metricGrid').innerHTML = cards.map(([label, value, sub]) => `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(sub)}</span>
    </article>
  `).join('');
}

function renderCharts() {
  renderBarChart('#timelineChart', state.stats.timeline, 'ms', (row) => `${row.period}: ${minutes(row.ms)}`);
  renderBarChart('#hourChart', state.stats.hourly, 'ms', (row) => `${String(row.hour).padStart(2, '0')}:00: ${minutes(row.ms)}`);
}

function renderBarChart(selector, rows, valueKey, labelFn) {
  const el = $(selector);
  const positiveRows = rows.filter((row) => Number(row[valueKey]) > 0);
  if (!positiveRows.length) {
    el.innerHTML = '<div class="empty">Import a Spotify export to see this chart.</div>';
    return;
  }
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  el.innerHTML = rows.map((row) => {
    const height = Math.max(2, Math.round((Number(row[valueKey]) || 0) / max * 100));
    return `<div class="bar" style="height:${height}%" title="${escapeHtml(labelFn(row))}"></div>`;
  }).join('');
}

function renderLists() {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxWeek = Math.max(...state.stats.weekday.map((row) => row.ms || 0), 1);
  $('#weekdayList').innerHTML = state.stats.weekday.some((row) => row.plays) ? state.stats.weekday.map((row) => `
    <div class="list-row">
      <strong>${weekdays[row.weekday]}</strong>
      <span>${hours(row.ms)}</span>
      <div class="mini-bar"><i style="width:${Math.round((row.ms || 0) / maxWeek * 100)}%"></i></div>
    </div>
  `).join('') : '<div class="empty">No weekday pattern yet.</div>';

  const streak = state.stats.streaks.longest || {};
  const biggest = state.stats.streaks.biggestDays || [];
  $('#streakList').innerHTML = `
    <div class="list-row">
      <strong>Longest streak</strong>
      <span>${streak.days || 0} days</span>
      <div class="meta">${streak.start ? `${date(streak.start)} to ${date(streak.end)}` : 'No listening days imported yet'}</div>
    </div>
    ${biggest.slice(0, 6).map((row) => `
      <div class="list-row">
        <strong>${date(row.day)}</strong>
        <span>${hours(row.ms)}</span>
        <div class="meta">${fmt.format(row.plays)} plays</div>
      </div>
    `).join('')}
  `;
}

function renderTable() {
  const tables = {
    tracks: {
      title: 'Songs',
      subtitle: 'Music rankings exclude podcasts',
      rows: state.stats.topTracks,
      columns: [['Track', 'track_name'], ['Artist', 'artist_name'], ['Album', 'album_name'], ['Plays', 'plays', fmt.format], ['Time', 'ms', hours], ['First', 'first_played', date], ['Last', 'last_played', date]]
    },
    artists: {
      title: 'Artists',
      subtitle: 'Ranked by total listening time',
      rows: state.stats.topArtists,
      columns: [['Artist', 'artist_name'], ['Plays', 'plays', fmt.format], ['Time', 'ms', hours], ['First', 'first_played', date], ['Last', 'last_played', date]]
    },
    albums: {
      title: 'Albums',
      subtitle: 'Grouped by album and artist',
      rows: state.stats.topAlbums,
      columns: [['Album', 'album_name'], ['Artist', 'artist_name'], ['Plays', 'plays', fmt.format], ['Time', 'ms', hours]]
    },
    shows: {
      title: 'Podcast Shows',
      subtitle: 'Separate from music rankings',
      rows: state.stats.topShows,
      columns: [['Show', 'show_name'], ['Plays', 'plays', fmt.format], ['Time', 'ms', hours], ['First', 'first_played', date], ['Last', 'last_played', date]]
    },
    episodes: {
      title: 'Podcast Episodes',
      subtitle: 'Top episodes by listening time',
      rows: state.stats.topEpisodes,
      columns: [['Episode', 'episode_name'], ['Show', 'show_name'], ['Plays', 'plays', fmt.format], ['Time', 'ms', hours]]
    },
    imports: {
      title: 'Imports',
      subtitle: 'Imported source files',
      rows: state.stats.imports,
      columns: [['File', 'source_file'], ['Records', 'record_count', fmt.format], ['Inserted', 'records_inserted', fmt.format], ['Duplicates', 'duplicate_records', fmt.format], ['Imported', 'imported_at', (value) => new Date(value).toLocaleString()]]
    }
  };

  const config = tables[state.activeTab];
  $('#tableTitle').textContent = config.title;
  $('#tableSubtitle').textContent = config.subtitle;
  renderDataTable(config.rows, config.columns);
}

function renderDataTable(rows, columns) {
  const table = $('#dataTable');
  if (!rows.length) {
    table.innerHTML = '<tbody><tr><td class="empty">No rows yet.</td></tr></tbody>';
    return;
  }
  table.innerHTML = `
    <thead><tr>${columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((row) => `
        <tr>${columns.map(([, key, formatter]) => `<td>${escapeHtml(formatter ? formatter(row[key]) : row[key] ?? '')}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  `;
}

function exportCsv(kind) {
  const configs = {
    tracks: { rows: state.stats.topTracks, name: 'tracks.csv' },
    artists: { rows: state.stats.topArtists, name: 'artists.csv' },
    albums: { rows: state.stats.topAlbums, name: 'albums.csv' },
    podcasts: { rows: [...state.stats.topShows, ...state.stats.topEpisodes], name: 'podcasts.csv' },
    plays: { rows: state.stats.plays, name: 'plays.csv' }
  };
  const config = configs[kind];
  if (!config || !config.rows.length) return;
  const blob = new Blob([toCsv(config.rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = config.name;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return `${headers.join(',')}\n${rows.map((row) => headers.map((key) => csvCell(row[key])).join(',')).join('\n')}\n`;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildEmptyStats() {
  return computeStats([], []);
}

function setStatus(message) {
  $('#statusText').textContent = message;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(' ', 'T')}:00Z`).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function stableKey(value) {
  return JSON.stringify(value);
}

function minDate(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a < b ? a : b;
}

function maxDate(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
