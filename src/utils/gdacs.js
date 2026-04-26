const GDACS_URL = 'https://www.gdacs.org/xml/rss.xml';

const GDACS_TYPE_MAP = {
  'EQ': 'earthquake', 'TC': 'cyclone', 'FL': 'flood',
  'VO': 'volcano', 'DR': 'drought', 'WF': 'fire', 'TS': 'cyclone', 'SS': 'flood'
};
const ALERT_URGENCY = { 'Red': 'critical', 'Orange': 'high', 'Green': 'medium' };

function parseXMLWithDOMParser(xmlText) {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, 'text/xml');
}

function getTagValue(element, tagName) {
  const el = element.getElementsByTagName(tagName)[0];
  return el ? el.textContent?.trim() : null;
}

function extractCoords(item) {
  try {
    const point = getTagValue(item, 'georss:point') || getTagValue(item, 'geo:pos');
    if (point) {
      const parts = point.trim().split(' ');
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    const lat = parseFloat(getTagValue(item, 'geo:lat'));
    const lng = parseFloat(getTagValue(item, 'geo:long'));
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  } catch { }
  return null;
}

function isNearIndia(lat, lng) {
  return lat >= 6 && lat <= 37 && lng >= 68 && lng <= 98;
}

function extractAlertLevel(item) {
  const allText = item.textContent?.toLowerCase() || '';
  if (allText.includes('"red"') || allText.includes('>red<')) return 'Red';
  if (allText.includes('"orange"') || allText.includes('>orange<')) return 'Orange';
  return 'Green';
}

function extractLocation(title, coords) {
  const stateMap = {
    'assam': 'Guwahati, Assam', 'kerala': 'Kochi, Kerala', 'odisha': 'Bhubaneswar, Odisha',
    'andhra': 'Visakhapatnam, Andhra Pradesh', 'gujarat': 'Ahmedabad, Gujarat',
    'rajasthan': 'Jaipur, Rajasthan', 'maharashtra': 'Mumbai, Maharashtra',
    'bihar': 'Patna, Bihar', 'west bengal': 'Kolkata, West Bengal',
    'tamil': 'Chennai, Tamil Nadu', 'karnataka': 'Bengaluru, Karnataka',
    'uttarakhand': 'Dehradun, Uttarakhand', 'manipur': 'Imphal, Manipur'
  };
  const lower = (title || '').toLowerCase();
  for (const [key, val] of Object.entries(stateMap)) {
    if (lower.includes(key)) return val;
  }
  if (!coords) return 'India';
  if (coords.lat > 25 && coords.lng < 80) return 'Rajasthan/MP Region';
  if (coords.lat > 25 && coords.lng > 88) return 'Northeast India';
  if (coords.lat < 15) return 'South India';
  return 'Central India';
}

function extractState(title) {
  const states = ['Assam', 'Kerala', 'Odisha', 'Gujarat', 'Rajasthan', 'Maharashtra',
    'Bihar', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'West Bengal', 'Uttarakhand'];
  for (const s of states) {
    if ((title || '').toLowerCase().includes(s.toLowerCase())) return s;
  }
  return 'India';
}

function getSkillsForType(type) {
  const map = {
    flood: ['Rescue Operations', 'Water Distribution', 'Medical Aid', 'Evacuation Support'],
    cyclone: ['Evacuation Support', 'Rescue Operations', 'Shelter Management', 'Medical Aid'],
    earthquake: ['Search and Rescue', 'Medical Aid', 'Shelter Management', 'Logistics'],
    fire: ['Fire Response', 'Evacuation Support', 'Medical Aid', 'Community Outreach'],
    drought: ['Water Distribution', 'Food Distribution', 'Community Outreach', 'Logistics'],
    health: ['Medical Aid', 'Sanitation', 'Awareness Campaign', 'First Aid'],
    volcano: ['Evacuation Support', 'Rescue Operations', 'Shelter Management'],
  };
  return map[type] || ['Medical Aid', 'Food Distribution', 'Community Outreach'];
}

// Try each proxy in sequence with 5s timeout each
async function fetchGDACSXML(url) {
  // Proxy 1: allorigins — returns JSON with .contents field
  try {
    console.log('🔄 GDACS: Trying allorigins proxy...');
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.contents && data.contents.includes('<item')) {
        console.log('✅ GDACS: allorigins proxy succeeded');
        return data.contents;
      }
    }
  } catch (err) {
    console.warn('GDACS proxy 1 (allorigins) failed:', err.message);
  }

  // Proxy 2: thingproxy — returns raw XML
  try {
    console.log('🔄 GDACS: Trying thingproxy...');
    const res = await fetch(`https://thingproxy.freeboard.io/fetch/${url}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.includes('<item')) {
        console.log('✅ GDACS: thingproxy succeeded');
        return text;
      }
    }
  } catch (err) {
    console.warn('GDACS proxy 2 (thingproxy) failed:', err.message);
  }

  // Proxy 3: codetabs — returns raw XML
  try {
    console.log('🔄 GDACS: Trying codetabs proxy...');
    const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.includes('<item')) {
        console.log('✅ GDACS: codetabs proxy succeeded');
        return text;
      }
    }
  } catch (err) {
    console.warn('GDACS proxy 3 (codetabs) failed:', err.message);
  }

  // All proxies failed
  return null;
}

export async function fetchGDACSEvents() {
  try {
    const xmlText = await fetchGDACSXML(GDACS_URL);
    if (!xmlText) {
      console.warn('GDACS: All proxies failed, using fallback crisis data');
      return null;
    }

    const doc = parseXMLWithDOMParser(xmlText);
    const items = doc.getElementsByTagName('item');
    const indiaEvents = [];

    for (let i = 0; i < Math.min(items.length, 25); i++) {
      const item = items[i];
      const coords = extractCoords(item);
      if (!coords) continue;
      if (!isNearIndia(coords.lat, coords.lng)) continue;

      const title = getTagValue(item, 'title') || 'Unknown Event';
      const description = (getTagValue(item, 'description') || '')
        .replace(/<[^>]*>/g, '').substring(0, 200).trim();
      const alertLevel = extractAlertLevel(item);
      const eventTypeRaw = getTagValue(item, 'gdacs:eventtype') || 'FL';
      const eventType = GDACS_TYPE_MAP[eventTypeRaw] || 'flood';
      const guidEl = item.getElementsByTagName('guid')[0];
      const guid = guidEl?.textContent?.trim() || Math.random().toString(36).substr(2, 9);

      indiaEvents.push({
        id: `gdacs-${guid.replace(/\W/g, '').slice(-9)}`,
        title: title.replace(/\s*-\s*GDACS.*$/i, '').trim(),
        type: eventType,
        location: extractLocation(title, coords),
        state: extractState(title),
        lat: coords.lat,
        lng: coords.lng,
        alertLevel,
        urgency: ALERT_URGENCY[alertLevel] || 'medium',
        riskScore: alertLevel === 'Red' ? 85 + Math.floor(Math.random() * 10) :
          alertLevel === 'Orange' ? 60 + Math.floor(Math.random() * 20) :
            35 + Math.floor(Math.random() * 20),
        description: description || `${eventType} event detected near Indian subcontinent.`,
        affectedPeople: Math.floor(Math.random() * 20000) + 1000,
        volunteersNeeded: alertLevel === 'Red' ? 200 : alertLevel === 'Orange' ? 100 : 50,
        volunteersDeployed: Math.floor(Math.random() * 30),
        skills: getSkillsForType(eventType),
        source: 'GDACS',
        publishedAt: getTagValue(item, 'pubDate') || new Date().toISOString(),
      });
    }

    console.log(`✅ GDACS: Found ${indiaEvents.length} events near India`);
    return indiaEvents.length > 0 ? indiaEvents : null;

  } catch (err) {
    console.warn('GDACS fetch failed, using fallback crisis data:', err.message);
    return null;
  }
}