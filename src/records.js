// Jukebox records (the Hermitage's jukebox, hermitage.js): each one is a song for the menus, kept on the account.
// More are to be found later in the game; the first two are owned from the start. `song` names a song in music.js
// (a record whose song hasn't been written yet plays nothing until it is).
export const RECORDS = [
  { id: 'lament', name: "The Ashen Lament", song: 'title', color: 0xc8402a, label: 0xf0d27a, desc: "Varek's motif slowed to a lament: harp, choir and bells" },
  { id: 'hearth', name: 'Hearthlight', song: 'hearth', color: 0x2a6ab8, label: 0xe8e0c8, desc: 'A second record for the fire' },
];
export const STARTING_RECORDS = ['lament', 'hearth'];

export const recordById = (id) => RECORDS.find((r) => r.id === id) || RECORDS[0];
// the records on an account (the starting two always), and the one in the jukebox
export function ownedRecords(data) { return RECORDS.filter((r) => STARTING_RECORDS.includes(r.id) || data?.records?.includes(r.id)); }
export const currentRecord = (data) => recordById(data?.record);
