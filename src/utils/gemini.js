import { fetchGDACSEvents } from './gdacs';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

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

function parseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text.replace(/```json\n?|```\n?/g, '').trim());
  } catch { return null; }
}

export async function detectCrises() {
  const cacheKey = 'crises';
  const cached = getCached(cacheKey);
  if (cached) { console.log('📦 Using cached crisis data'); return cached; }

  const gdacsData = await fetchGDACSEvents();
  if (gdacsData && gdacsData.length > 0) {
    console.log('🌍 Using real GDACS disaster data');
    setCache(cacheKey, gdacsData);
    return gdacsData;
  }

  console.log('🤖 Calling Gemini AI for crisis data');
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const prompt = `You are SevaSphere's crisis intelligence AI for India.
Generate 5 realistic crisis scenarios for ${month} based on seasonal disaster patterns in India.
Return ONLY a JSON array, no other text:
[{
  "id": "c1",
  "title": "string",
  "type": "flood|heatwave|cyclone|food|health|fire",
  "location": "City, State",
  "state": "State",
  "lat": number,
  "lng": number,
  "riskScore": number between 50-95,
  "affectedPeople": number,
  "urgency": "critical|high|medium",
  "description": "2 sentence realistic description",
  "volunteersNeeded": number,
  "volunteersDeployed": number,
  "skills": ["skill1","skill2","skill3"],
  "source": "Gemini AI"
}]`;
  const result = parseJSON(await callGemini(prompt)) || getDefaultCrises();
  setCache(cacheKey, result);
  return result;
}

export async function enhanceNeedWithAI(title, description, location) {
  const cacheKey = `enhance-${title}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are SevaSphere's AI coordinator. An NGO posted this volunteer need:
Title: "${title}", Description: "${description}", Location: "${location}"
Return ONLY JSON, no other text:
{
  "priority": number (1-10),
  "suggestedSkills": ["skill1","skill2","skill3"],
  "estimatedVolunteers": number,
  "urgency": "critical|high|medium|low",
  "aiSummary": "One sentence describing real-world impact of this need"
}`;
  const result = parseJSON(await callGemini(prompt));
  if (result) setCache(cacheKey, result);
  return result;
}

export async function matchVolunteers(need, volunteers) {
  if (!volunteers.length) return [];
  const prompt = `You are SevaSphere's volunteer matching AI.
Need: "${need.title}" in ${need.location}. Skills needed: ${need.skills?.join(', ')}. Urgency: ${need.urgency}
Volunteers:
${volunteers.map((v, i) => `${i}: ${v.name} | Skills: ${v.skills?.join(', ')} | Location: ${v.location}`).join('\n')}
Return ONLY JSON array of top matches (max 5):
[{"index": 0, "score": 95, "reason": "string"}]`;
  return parseJSON(await callGemini(prompt)) || [];
}

export async function generateSituationReport(crises, stats) {
  const cacheKey = `report-${crises.length}-${stats.totalAffected}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are SevaSphere's AI generating an official crisis situation report for India.
Current data:
- Active crises: ${crises.length}
- Total affected: ${stats.totalAffected?.toLocaleString()}
- Volunteers deployed: ${stats.totalDeployed}/${stats.totalNeeded}
- Critical alerts: ${crises.filter(c=>c.urgency==='critical').length}

Crisis details:
${crises.map((c,i) => `${i+1}. ${c.title} | ${c.location} | Risk: ${c.riskScore}/100 | Urgency: ${c.urgency} | Affected: ${c.affectedPeople?.toLocaleString()} | Volunteers: ${c.volunteersDeployed}/${c.volunteersNeeded}`).join('\n')}

Generate a formal government-ready situation report with these exact sections:
# SEVASPHERE CRISIS SITUATION REPORT
**Reference ID:** SS/IND/${new Date().toISOString().slice(0,10)}/001
**Status:** ACTIVE
**Date:** ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}
**Region:** Republic of India

## 1. Executive Summary
[2-3 sentences summarizing the crisis landscape and urgency]

## 2. Priority Breakdown
| Priority | Crisis Count | Key Risk |
|---|---|---|
[fill table]

## 3. Crisis Analysis & Recommended Actions
[For each crisis: title, location, situation, and 2-3 specific recommended actions]

## 4. Resource Gap Analysis
[Volunteer gaps, skills most needed, geographic priorities]

## 5. Immediate Action Items
[Numbered list of 5 concrete actions for NGOs]

---
*Generated by SevaSphere AI · Powered by Google Gemini · For official use*`;

  const result = await callGemini(prompt);
  if (result) setCache(cacheKey, result);
  return result;
}

export async function generateVolunteerImpact(applications, userProfile) {
  const cacheKey = `impact-${userProfile?.uid}-${applications.length}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  if (applications.length === 0) return null;

  const prompt = `You are SevaSphere's AI generating a volunteer impact assessment.
Volunteer: ${userProfile?.name}, Location: ${userProfile?.location}
Skills: ${userProfile?.skills?.join(', ')}
Applications submitted: ${applications.length}
Needs helped: ${applications.map(a => a.needTitle).join(', ')}

Return ONLY JSON:
{
  "impactScore": number (0-100),
  "livesImpacted": number,
  "hoursEstimate": number,
  "badge": "First Responder|Community Hero|Crisis Champion|Disaster Warrior|Relief Expert",
  "message": "One personalized sentence praising their specific contribution",
  "topSkill": "string"
}`;
  const result = parseJSON(await callGemini(prompt));
  if (result) setCache(cacheKey, result);
  return result;
}

function getDefaultCrises() {
  return [
    { id:"c1", title:"Brahmaputra Flooding Crisis", type:"flood", location:"Guwahati, Assam", state:"Assam", lat:26.1445, lng:91.7362, riskScore:92, affectedPeople:15000, urgency:"critical", description:"Heavy monsoon rainfall causing severe flooding across low-lying residential areas.", volunteersNeeded:200, volunteersDeployed:45, skills:["Rescue Operations","Medical Aid","Food Distribution"], source:"Gemini AI" },
    { id:"c2", title:"Severe Heatwave Alert", type:"heatwave", location:"Nagpur, Maharashtra", state:"Maharashtra", lat:21.1458, lng:79.0882, riskScore:78, affectedPeople:8000, urgency:"high", description:"Temperatures exceeding 47°C threatening elderly populations and outdoor workers.", volunteersNeeded:100, volunteersDeployed:23, skills:["Medical Aid","Water Distribution","Shelter Management"], source:"Gemini AI" },
    { id:"c3", title:"Food Security Crisis", type:"food", location:"Barmer, Rajasthan", state:"Rajasthan", lat:25.7521, lng:71.3967, riskScore:65, affectedPeople:5000, urgency:"medium", description:"Drought conditions leaving remote villages without sufficient food supplies.", volunteersNeeded:75, volunteersDeployed:30, skills:["Food Distribution","Logistics","Community Outreach"], source:"Gemini AI" },
    { id:"c4", title:"Cyclone Pre-Alert: Bay of Bengal", type:"cyclone", location:"Visakhapatnam, Andhra Pradesh", state:"Andhra Pradesh", lat:17.6868, lng:83.2185, riskScore:88, affectedPeople:25000, urgency:"critical", description:"Category 3 cyclone expected to make landfall within 48 hours. Evacuation underway.", volunteersNeeded:300, volunteersDeployed:60, skills:["Evacuation Support","Rescue Operations","Shelter Management","Medical Aid"], source:"Gemini AI" },
    { id:"c5", title:"Dengue Outbreak", type:"health", location:"Patna, Bihar", state:"Bihar", lat:25.5941, lng:85.1376, riskScore:71, affectedPeople:3000, urgency:"high", description:"Rising dengue cases overwhelming local healthcare infrastructure in urban areas.", volunteersNeeded:80, volunteersDeployed:25, skills:["Medical Aid","Awareness Campaign","Sanitation"], source:"Gemini AI" }
  ];
}