// Verified public arms: Wikidata P771 (OFS) and P94, with Commons source metadata.
const verifiedCoats = {
  "6702": {
    "name": "Boécourt",
    "filename": "CHE Boécourt COA.svg",
    "asset": "communes/6702.svg",
    "source": "https://www.wikidata.org/wiki/Q69942",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Bo%C3%A9court_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-11-19"
  },
  "5484": {
    "name": "Gollion",
    "filename": "CHE Gollion COA.svg",
    "asset": "communes/5484.svg",
    "source": "https://www.wikidata.org/wiki/Q70594",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Gollion_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-28"
  },
  "5744": {
    "name": "Ballaigues",
    "filename": "CHE Ballaigues COA.svg",
    "asset": "communes/5744.svg",
    "source": "https://www.wikidata.org/wiki/Q43239",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Ballaigues_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-27"
  },
  "5586": {
    "name": "Lausanne",
    "filename": "CHE Lausanne COA.svg",
    "asset": "communes/5586.svg",
    "source": "https://www.wikidata.org/wiki/Q807",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Lausanne_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-23"
  },
  "6757": {
    "name": "Saignelégier",
    "filename": "CHE Saignelégier COA.svg",
    "asset": "communes/6757.svg",
    "source": "https://www.wikidata.org/wiki/Q67666",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Saignel%C3%A9gier_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-23"
  },
  "2196": {
    "name": "Fribourg",
    "filename": "CHE Fribourg COA.svg",
    "asset": "communes/2196.svg",
    "source": "https://www.wikidata.org/wiki/Q36378",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Fribourg_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-23"
  },
  "6729": {
    "name": "Haute-Sorne",
    "filename": "CHE Haute-Sorne COA.svg",
    "asset": "communes/6729.svg",
    "source": "https://www.wikidata.org/wiki/Q5682949",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Haute-Sorne_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-23"
  },
  "5402": {
    "name": "Bex",
    "filename": "CHE Bex COA.svg",
    "asset": "communes/5402.svg",
    "source": "https://www.wikidata.org/wiki/Q52261",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Bex_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-23"
  },
  "5649": {
    "name": "Tolochenaz",
    "filename": "CHE Tolochenaz COA.svg",
    "asset": "communes/5649.svg",
    "source": "https://www.wikidata.org/wiki/Q69398",
    "filePage": "https://commons.wikimedia.org/wiki/File:CHE_Tolochenaz_COA.svg",
    "license": "Public domain",
    "retrieved": "2026-10-23"
  }
};

export default verifiedCoats;
// Both public and editor views use the same persistent server cache on a miss.
export function communeCoat(bfsId, asset = path => `public/${path}`) {
  const id=String(bfsId ?? '');
  if (!/^[1-9]\d{0,4}$/.test(id)) return null;
  const bundled=verifiedCoats[id];
  if(bundled)return {...bundled,url:/^https:\/\//.test(bundled.asset)?bundled.asset:asset(bundled.asset)};
  const url=`https://ozdvmllgxduzquiujcbg.supabase.co/functions/v1/communal-coat?bfs=${id}`;
  return {filename:`OFS-${id}`,url,source:`${url}&source=1`};
}
