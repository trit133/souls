// Jukebox records (the Hermitage's jukebox, hermitage.js): each one is a song for the menus, kept on the account.
// More are to be found later in the game; STARTING_RECORDS are owned from the start. `song` names a song in music.js,
// written there or recorded (public/audio/music); a record with no song yet plays nothing until it has one.
export const RECORDS = [
  { id: 'lament', name: "The Ashen Lament", song: 'title', color: 0xc8402a, label: 0xf0d27a, desc: "Varek's motif slowed to a lament: harp, choir and bells" },
  { id: 'hearth', name: 'Hearthlight', song: 'hearth', color: 0x2a6ab8, label: 0xe8e0c8, desc: 'A second record for the fire' },
  { id: 'stonehall', name: 'Stone Hall Idle', song: 'stonehall', color: 0x6e6c70, label: 0xcfc6b4, desc: 'A recording from the Sanctum: techno under the stone' },
  { id: 'machine', name: 'Stone and Machine', song: 'machine', color: 0x8a3c1c, label: 0xd9b26e, desc: 'A recording from the Sanctum: iron and engines' },
];
export const STARTING_RECORDS = ['lament', 'hearth', 'stonehall', 'machine'];

export const recordById = (id) => RECORDS.find((r) => r.id === id) || RECORDS[0];
// the records on an account (the starting two always), and the one in the jukebox
export function ownedRecords(data) { return RECORDS.filter((r) => STARTING_RECORDS.includes(r.id) || data?.records?.includes(r.id)); }
export const currentRecord = (data) => recordById(data?.record);
