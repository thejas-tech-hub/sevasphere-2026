import { fetchGDACSEvents } from './gdacs';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// ─── CACHE ────────────────────────────────────────────────────────────────────
const CACHE = {};
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key) {
  const item = CACHE[key];
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) { delete CACHE[key]; return null; }
  return item.data;
}
function setCache(key, data) {
  CACHE[key] = { data, timestamp: Date.now() };
}

// ─── SAFE JSON PARSE — handles truncated responses ────
function extractStringField(text, field) {
  // Matches "field": "value" — captures value allowing escaped quotes
  const re = new RegExp('"' + field + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"');
  const m = text.match(re);
  return m ? m[1] : null;
}
function extractNumberField(text, field) {
  const re = new RegExp('"' + field + '"\\s*:\\s*(\\d+(?:\\.\\d+)?)');
  const m = text.match(re);
  return m ? parseFloat(m[1]) : null;
}
function extractArrayField(text, field) {
  // Try to match a complete JSON array
  const re = new RegExp('"' + field + '"\\s*:\\s*\\[([^\\]]*?)\\]');
  const m = text.match(re);
  if (m) {
    try {
      return JSON.parse('[' + m[1] + ']');
    } catch {
      // Extract quoted strings manually
      const items = [];
      const strRe = /"((?:[^"\\]|\\.)*)"/g;
      let sm;
      while ((sm = strRe.exec(m[1])) !== null) items.push(sm[1]);
      return items.length > 0 ? items : null;
    }
  }
  // Array was truncated (no closing bracket)
  const re2 = new RegExp('"' + field + '"\\s*:\\s*\\[([^\\]]*?)$');
  const m2 = text.match(re2);
  if (m2) {
    const items = [];
    const strRe = /"((?:[^"\\]|\\.)*)"/g;
    let sm;
    while ((sm = strRe.exec(m2[1])) !== null) items.push(sm[1]);
    return items.length > 0 ? items : null;
  }
  return null;
}

function safeParseJSON(text) {
  if (!text) return null;
  let clean = text.replace(/```json\n?|```\n?/g, '').trim();

  // Try full parse first
  try { return JSON.parse(clean); } catch { }

  // Try to find and parse just the object
  try {
    const start = clean.indexOf('{');
    let end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.substring(start, end + 1));
    }
  } catch { }

  // Regex-based field extraction for truncated JSON
  try {
    const start = clean.indexOf('{');
    if (start !== -1) {
      const partial = clean.substring(start);
      const obj = {};
      // Extract all possible string fields
      for (const f of ['title', 'description', 'location', 'urgency', 'aiSummary', 'badge', 'message', 'topSkill', 'reason']) {
        const v = extractStringField(partial, f);
        if (v !== null) obj[f] = v;
      }
      // Extract number fields
      for (const f of ['volunteersNeeded', 'priority', 'estimatedVolunteers', 'impactScore', 'livesImpacted', 'hoursEstimate', 'index', 'score']) {
        const v = extractNumberField(partial, f);
        if (v !== null) obj[f] = v;
      }
      // Extract array fields
      for (const f of ['skills', 'suggestedSkills']) {
        const v = extractArrayField(partial, f);
        if (v !== null) obj[f] = v;
      }

      // Apply sensible defaults for vision/OCR responses
      if (Object.keys(obj).length > 0) {
        if (!obj.urgency) obj.urgency = 'high';
        if (!obj.volunteersNeeded && obj.volunteersNeeded !== 0) obj.volunteersNeeded = 20;
        if (!obj.skills) obj.skills = ['Community Outreach'];
        if (!obj.aiSummary) obj.aiSummary = 'Volunteer support needed for disaster relief.';
        return obj;
      }
    }
  } catch { }

  return null;
}

// ─── PLAIN TEXT CALL ────
async function callGemini(prompt) {
  try {
    const res = await fetch(`${BASE_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Gemini error:', err);
    return null;
  }
}

// ─── STRUCTURED JSON CALL ─────
async function callGeminiJSON(prompt) {
  try {
    const res = await fetch(`${BASE_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text;
    // Use safe parser to handle any truncation
    const result = safeParseJSON(text);
    if (!result) throw new Error('Could not parse JSON response');
    return result;
  } catch (err) {
    console.error('Gemini JSON error:', err);
    return null;
  }
}

// ─── VISION CALL — gemini-2.0-flash supports images ──────
async function callGeminiVision(base64Image, mimeType, prompt) {
  try {
    const res = await fetch(`${BASE_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Image } },
            { text: prompt + '\n\nIMPORTANT: Return ONLY raw JSON, no markdown, no backticks, no explanation.' }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text;
    console.log('Vision raw response:', text);
    return safeParseJSON(text);
  } catch (err) {
    console.error('Gemini vision error:', err);
    return null;
  }
}

// ─── EXPORTED FUNCTIONS ────

export async function detectCrises() {
  const cacheKey = 'crises';
  const cached = getCached(cacheKey);
  if (cached) { console.log('📦 Using cached crisis data'); return cached; }

  // Try GDACS first — real UN data
  const gdacsData = await fetchGDACSEvents();
  if (gdacsData && gdacsData.length > 0) {
    console.log('🌍 Using real GDACS disaster data');
    setCache(cacheKey, gdacsData);
    return gdacsData;
  }

  // GDACS failed — use default crises immediately
  // Do NOT call Gemini here — saves quota for enhance/upload/reports
  console.log('📋 Using default crisis intelligence data');
  const defaults = getDefaultCrises();
  setCache(cacheKey, defaults);
  return defaults;
}

export async function enhanceNeedWithAI(title, description, location) {
  const cacheKey = `enhance-${title}-${location}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are SevaSphere's AI coordinator for Indian NGOs.
Analyze this volunteer need:
Title: "${title}"
Description: "${description}"
Location: "${location}"
Return a JSON object:
{
  "priority": 8,
  "suggestedSkills": ["Medical Aid","Food Distribution","Community Outreach"],
  "estimatedVolunteers": 25,
  "urgency": "high",
  "aiSummary": "One sentence about real-world impact."
}`;
  const result = await callGeminiJSON(prompt);
  if (result) { setCache(cacheKey, result); return result; }

  // Fallback when Gemini is unavailable (e.g. 429 quota exceeded)
  const lower = (title + ' ' + (description || '')).toLowerCase();
  let urgency = 'medium';
  let skills = ['Community Outreach', 'Logistics'];
  if (lower.includes('flood') || lower.includes('cyclone') || lower.includes('earthquake') || lower.includes('rescue')) {
    urgency = 'critical'; skills = ['Rescue Operations', 'Medical Aid', 'Evacuation Support'];
  } else if (lower.includes('medical') || lower.includes('health') || lower.includes('dengue') || lower.includes('disease')) {
    urgency = 'high'; skills = ['Medical Aid', 'First Aid', 'Sanitation'];
  } else if (lower.includes('food') || lower.includes('hunger') || lower.includes('drought')) {
    urgency = 'high'; skills = ['Food Distribution', 'Water Distribution', 'Logistics'];
  } else if (lower.includes('shelter') || lower.includes('housing') || lower.includes('relief')) {
    urgency = 'high'; skills = ['Shelter Management', 'Logistics', 'Community Outreach'];
  }
  const fallback = {
    priority: urgency === 'critical' ? 9 : urgency === 'high' ? 7 : 5,
    suggestedSkills: skills,
    estimatedVolunteers: urgency === 'critical' ? 50 : urgency === 'high' ? 25 : 15,
    urgency,
    aiSummary: `Volunteers needed for "${title}" in ${location || 'the affected area'}. Community support is essential.`
  };
  setCache(cacheKey, fallback);
  return fallback;
}

export async function matchVolunteers(need, volunteers) {
  if (!volunteers.length) return [];
  const prompt = `You are SevaSphere's volunteer matching AI.
Need: "${need.title}" in ${need.location}. Skills: ${need.skills?.join(', ')}. Urgency: ${need.urgency}
Volunteers:
${volunteers.map((v, i) => `${i}: ${v.name} | Skills: ${v.skills?.join(', ')} | Location: ${v.location}`).join('\n')}
Return a JSON array of top 5 matches:
[{"index": 0, "score": 95, "reason": "reason"}]`;
  return await callGeminiJSON(prompt) || [];
}

export async function generateSituationReport(crises, stats) {
  const cacheKey = `report-${crises.length}-${stats.totalAffected}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are SevaSphere's AI generating a crisis situation report for India.
Data:
- Active crises: ${crises.length}
- Total affected: ${stats.totalAffected?.toLocaleString()}
- Volunteers deployed: ${stats.totalDeployed}/${stats.totalNeeded}
- Critical alerts: ${crises.filter(c => c.urgency === 'critical').length}

Crises:
${crises.map((c, i) => `${i + 1}. ${c.title} | ${c.location} | Risk: ${c.riskScore}/100 | ${c.urgency} | Affected: ${c.affectedPeople?.toLocaleString()} | Volunteers: ${c.volunteersDeployed}/${c.volunteersNeeded}`).join('\n')}

Write a formal government-ready situation report with:
# SEVASPHERE CRISIS SITUATION REPORT
**Reference ID:** SS/IND/${new Date().toISOString().slice(0, 10)}/001
**Status:** ACTIVE
**Date:** ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
**Region:** Republic of India

## 1. Executive Summary
## 2. Priority Breakdown (include a markdown table)
## 3. Crisis Analysis and Recommended Actions (for each crisis)
## 4. Resource Gap Analysis
## 5. Immediate Action Items (numbered list)

---
*Generated by SevaSphere AI · Powered by Google Gemini*`;

  const result = await callGemini(prompt);
  if (result) { setCache(cacheKey, result); return result; }

  // Fallback template when Gemini is unavailable (e.g. 429 quota exceeded)
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const refId = `SS/IND/${new Date().toISOString().slice(0, 10)}/001`;
  const criticalCount = crises.filter(c => c.urgency === 'critical').length;
  const highCount = crises.filter(c => c.urgency === 'high').length;
  const volGap = (stats.totalNeeded || 0) - (stats.totalDeployed || 0);

  const crisisRows = crises.map((c, i) =>
    `| ${i + 1} | ${c.title} | ${c.location} | ${c.riskScore}/100 | ${c.urgency?.toUpperCase()} | ${(c.affectedPeople || 0).toLocaleString()} | ${c.volunteersDeployed || 0}/${c.volunteersNeeded || 0} |`
  ).join('\n');

  const crisisDetails = crises.map((c, i) =>
    `### ${i + 1}. ${c.title}\n- **Location:** ${c.location}\n- **Risk Score:** ${c.riskScore}/100\n- **Urgency:** ${c.urgency?.toUpperCase()}\n- **Affected Population:** ${(c.affectedPeople || 0).toLocaleString()}\n- **Description:** ${c.description || 'Ongoing crisis requiring immediate attention.'}\n- **Required Skills:** ${c.skills?.join(', ') || 'General volunteer support'}\n- **Recommended Action:** Deploy ${c.volunteersNeeded || 0} volunteers for ${c.skills?.[0] || 'relief operations'} immediately.`
  ).join('\n\n');

  const fallbackReport = `# SEVASPHERE CRISIS SITUATION REPORT

**Reference ID:** ${refId}
**Status:** ACTIVE
**Date:** ${dateStr}
**Region:** Republic of India

## 1. Executive Summary

SevaSphere is currently monitoring **${crises.length} active crisis events** across India, affecting approximately **${(stats.totalAffected || 0).toLocaleString()} people**. Of these, **${criticalCount} are classified as critical** and **${highCount} as high priority**. A total of **${stats.totalDeployed || 0} volunteers** have been deployed against a requirement of **${stats.totalNeeded || 0}**, leaving a gap of **${volGap} volunteers**. Immediate mobilization is recommended for all critical zones.

## 2. Priority Breakdown

| # | Crisis | Location | Risk Score | Urgency | Affected | Volunteers |
|---|--------|----------|------------|---------|----------|------------|
${crisisRows}

## 3. Crisis Analysis and Recommended Actions

${crisisDetails}

## 4. Resource Gap Analysis

- **Total Volunteers Needed:** ${stats.totalNeeded || 0}
- **Currently Deployed:** ${stats.totalDeployed || 0}
- **Volunteer Gap:** ${volGap} (${stats.totalNeeded ? Math.round((volGap / stats.totalNeeded) * 100) : 0}% shortfall)
- **Priority Areas:** ${crises.filter(c => c.urgency === 'critical').map(c => c.location).join(', ') || 'Multiple regions'}

## 5. Immediate Action Items

1. Deploy additional volunteers to all critical-urgency zones immediately
2. Activate emergency medical response teams in high-risk areas
3. Coordinate with local authorities for evacuation and shelter management
4. Establish communication channels with affected communities
5. Mobilize food and water distribution networks to underserved areas
6. Set up medical camps in regions with health-related crises
7. Begin community outreach and awareness campaigns

---
*Generated by SevaSphere AI · Template Report (Gemini unavailable)*`;

  setCache(cacheKey, fallbackReport);
  return fallbackReport;
}

export async function generateVolunteerImpact(applications, userProfile) {
  const cacheKey = `impact-${userProfile?.uid}-${applications.length}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  if (applications.length === 0) return null;

  const prompt = `You are SevaSphere's AI generating a volunteer impact assessment.
Volunteer: ${userProfile?.name}, Location: ${userProfile?.location}
Skills: ${userProfile?.skills?.join(', ')}
Total applications: ${applications.length}
Missions: ${applications.map(a => a.needTitle).join(', ')}
Return a JSON object:
{
  "impactScore": 75,
  "livesImpacted": 500,
  "hoursEstimate": 24,
  "badge": "Community Hero",
  "message": "Personalized one sentence about their contribution.",
  "topSkill": "Medical Aid"
}
Badge options: First Responder, Community Hero, Crisis Champion, Disaster Warrior, Relief Expert`;
  const result = await callGeminiJSON(prompt);
  if (result) setCache(cacheKey, result);
  return result;
}

// ─── MULTIMODAL — reads handwritten field reports ──────────────────────────────
export async function extractFromHandwrittenReport(base64Image, mimeType) {
  const cacheKey = `ocr-${base64Image.slice(-30)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are SevaSphere's AI field report reader for Indian NGOs.
This image is a handwritten field report or paper survey from a disaster relief volunteer.
Read all handwriting carefully.
Return ONLY this exact JSON structure with no extra text:
{
  "title": "brief title here",
  "description": "what volunteers need to do",
  "location": "City, State",
  "urgency": "high",
  "skills": ["Medical Aid", "Community Outreach"],
  "volunteersNeeded": 20,
  "aiSummary": "one sentence impact description"
}`;

  const result = await callGeminiVision(base64Image, mimeType, prompt);
  console.log('Parsed vision result:', result);
  if (result) setCache(cacheKey, result);
  return result;
}

// ─── DEFAULT FALLBACK ───
function getDefaultCrises() {
  return [
    { id: 'c1', title: 'Brahmaputra Flooding Crisis', type: 'flood', location: 'Guwahati, Assam', state: 'Assam', lat: 26.1445, lng: 91.7362, riskScore: 92, affectedPeople: 15000, urgency: 'critical', description: 'Heavy monsoon rainfall causing severe flooding across low-lying residential areas.', volunteersNeeded: 200, volunteersDeployed: 45, skills: ['Rescue Operations', 'Medical Aid', 'Food Distribution'], source: 'Gemini AI' },
    { id: 'c2', title: 'Severe Heatwave Alert', type: 'heatwave', location: 'Nagpur, Maharashtra', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, riskScore: 78, affectedPeople: 8000, urgency: 'high', description: 'Temperatures exceeding 47°C threatening elderly populations and outdoor workers.', volunteersNeeded: 100, volunteersDeployed: 23, skills: ['Medical Aid', 'Water Distribution', 'Shelter Management'], source: 'Gemini AI' },
    { id: 'c3', title: 'Food Security Crisis', type: 'food', location: 'Barmer, Rajasthan', state: 'Rajasthan', lat: 25.7521, lng: 71.3967, riskScore: 65, affectedPeople: 5000, urgency: 'medium', description: 'Drought conditions leaving remote villages without sufficient food supplies.', volunteersNeeded: 75, volunteersDeployed: 30, skills: ['Food Distribution', 'Logistics', 'Community Outreach'], source: 'Gemini AI' },
    { id: 'c4', title: 'Cyclone Pre-Alert: Bay of Bengal', type: 'cyclone', location: 'Visakhapatnam, Andhra Pradesh', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, riskScore: 88, affectedPeople: 25000, urgency: 'critical', description: 'Category 3 cyclone expected to make landfall within 48 hours. Evacuation underway.', volunteersNeeded: 300, volunteersDeployed: 60, skills: ['Evacuation Support', 'Rescue Operations', 'Shelter Management'], source: 'Gemini AI' },
    { id: 'c5', title: 'Dengue Outbreak', type: 'health', location: 'Patna, Bihar', state: 'Bihar', lat: 25.5941, lng: 85.1376, riskScore: 71, affectedPeople: 3000, urgency: 'high', description: 'Rising dengue cases overwhelming local healthcare infrastructure in urban areas.', volunteersNeeded: 80, volunteersDeployed: 25, skills: ['Medical Aid', 'Awareness Campaign', 'Sanitation'], source: 'Gemini AI' }
  ];
}