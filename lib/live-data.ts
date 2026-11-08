// How long the browser may reuse a page's data before asking the server again.
// Five minutes lets pages be fetched ahead of a tap and open instantly. Saving,
// importing, signing out and the Refresh button all clear it straight away.
export const LIVE_DATA = { stale: 300, revalidate: 300, expire: 600 };
