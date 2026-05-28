/**
 * Video havuzu — "kademe" yerine genel "Video Listesi" terminolojisi.
 */

const LEGACY_LEVEL_PREFIX = 'Video Listesi';

export function resolveVideoListName(item) {
  const candidates = [
    item?.listName,
    item?.videoListName,
    item?.categoryName,
    item?.levelName,
    item?.kademeName,
    item?.name,
  ];
  for (const raw of candidates) {
    const text = String(raw ?? '').trim();
    if (text && !/^kademe\s*\d*$/i.test(text)) {
      return text;
    }
  }
  const level = Number(item?.level);
  if (Number.isFinite(level) && level > 0) {
    return `${LEGACY_LEVEL_PREFIX} ${level}`;
  }
  return 'Video Listesi';
}

export function formatVideoListMeta(item) {
  const branch = item?.branch ? `${item.branch} · ` : '';
  const song = item?.songName ? ` · ${item.songName}` : '';
  return `${branch}${resolveVideoListName(item)}${song}`;
}

export function buildVideoListFilterOptions(videos, { allLabel = 'Tüm Listeler' } = {}) {
  const names = new Set();
  (videos ?? []).forEach((v) => {
    names.add(resolveVideoListName(v));
  });
  const sorted = [...names].sort((a, b) => a.localeCompare(b, 'tr'));
  return [{ value: '', label: allLabel }, ...sorted.map((name) => ({ value: name, label: name }))];
}
