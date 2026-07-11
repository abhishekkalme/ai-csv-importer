import { config } from '../config';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = [
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'llama3-8b-8192',
];

interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

async function callGroq(messages: ChatMessage[], attempt = 1): Promise<string> {
  const model = MODELS[Math.min(attempt - 1, MODELS.length - 1)];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (attempt < MODELS.length) {
      await new Promise((r) => setTimeout(r, 2000));
      return callGroq(messages, attempt + 1);
    }
    const msg = err instanceof Error ? err.message : 'fetch failed';
    throw new Error('Groq request failed: ' + msg);
  }
  clearTimeout(timeoutId);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '15', 10);
    const waitMs = Math.min(retryAfter * 1000, 30000);
    if (attempt < MODELS.length) {
      await new Promise((r) => setTimeout(r, waitMs));
      return callGroq(messages, attempt + 1);
    }
    throw new Error('Groq rate limited after retries');
  }

  if (!response.ok) {
    const body = await response.text();
    if (attempt < MODELS.length) {
      await new Promise((r) => setTimeout(r, 2000));
      return callGroq(messages, attempt + 1);
    }
    throw new Error(`Groq API error ${response.status}: ${body}`);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned empty response');
  }
  const trimmed = content.trim();

  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    if (attempt < MODELS.length) {
      await new Promise((r) => setTimeout(r, 2000));
      return callGroq(messages, attempt + 1);
    }
  }

  return trimmed;
}

export interface ColumnMapping {
  [csvHeader: string]: string;
}

interface MappingResponse {
  mappings: ColumnMapping;
  unmapped: string[];
}

export async function mapColumns(
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<MappingResponse> {
  const systemPrompt = `You are a data mapping assistant for GrowEasy CRM. Given CSV headers and sample rows, map each column to the most appropriate CRM field.`;

  const userPrompt = `CRM FIELDS (with descriptions):
- created_at: Lead creation/date timestamp (e.g., "2026-05-13 14:20:48", "29-06-2026 10:00", "Jun 23, 2026, 2:37 PM")
- name: Full name of the lead
- email: Primary email address
- country_code: Country code extracted from phone (e.g., "+91", "+1", "+44") — include the + sign
- mobile_without_country_code: Mobile number WITHOUT country code prefix
- company: Company or organization name
- city: City name
- state: State or region
- country: Country name
- lead_owner: Person assigned to the lead
- crm_status: One of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE
- crm_note: Notes, remarks, or any unmapped data
- data_source: One of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots
- possession_time: Property possession/deadline time
- description: Free-form description

HEADERS: ${JSON.stringify(headers)}

SAMPLE ROWS (first ${Math.min(sampleRows.length, 3)}):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

RULES:
1. Map each CSV header to the semantically closest CRM field
2. For ambiguous columns like "phone", "contact", "mobile" → map to BOTH "country_code" and "mobile_without_country_code"
3. Columns like "Full Name", "Name", "lead name", "customer" → map to "name"
4. Email variants ("Email", "E-mail", "Email Address", "Email ID") → map to "email"
5. Phone/contact variants → map to BOTH "country_code" and "mobile_without_country_code"
6. Date/time columns → map to "created_at"
7. Notes/remarks/description → map to "crm_note" or "description"
8. Columns with no clear match → map to "crm_note"
9. If "Status" column contains CRM-like values → map to "crm_status"
10. "Lead Source" → map to "data_source"

Respond with ONLY valid JSON, no markdown, no code fences:
{
  "mappings": { "CSV Header": "crm_field", ... },
  "unmapped": ["headers that couldn't be mapped"]
}`;

  try {
    const text = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const mappings: ColumnMapping = {};
    const unmapped: string[] = [];

    for (const [header, field] of Object.entries(parsed.mappings || {})) {
      const fieldStr = String(field).toLowerCase().trim();
      if (fieldStr === 'unmapped') {
        unmapped.push(header);
      } else {
        mappings[header] = fieldStr;
      }
    }

    for (const h of parsed.unmapped || []) {
      unmapped.push(h);
    }

    return { mappings, unmapped };
  } catch {
    return { mappings: keywordMapHeaders(headers), unmapped: [] };
  }
}

function keywordMapHeaders(headers: string[]): ColumnMapping {
  const rules: [RegExp, string][] = [
    [/^(full\s+)?name$/i, 'name'],
    [/^lead\s+name$/i, 'name'],
    [/^customer(\s+name)?$/i, 'name'],
    [/^contact(\s+name)?$/i, 'name'],
    [/^first(\s+)?name$/i, 'name'],
    [/^last(\s+)?name$/i, 'name'],
    [/^email/i, 'email'],
    [/^e[\s-]?mail/i, 'email'],
    [/^phone/i, 'mobile_without_country_code'],
    [/^mobile/i, 'mobile_without_country_code'],
    [/^contact\s*(number|no)?$/i, 'mobile_without_country_code'],
    [/^telephone/i, 'mobile_without_country_code'],
    [/^cell/i, 'mobile_without_country_code'],
    [/^date\s*(created|created|added)?$/i, 'created_at'],
    [/^created(\s*(at|on|date))?$/i, 'created_at'],
    [/^timestamp$/i, 'created_at'],
    [/^company(\s+name)?$/i, 'company'],
    [/^organization/i, 'company'],
    [/^org$/i, 'company'],
    [/^lead\s*owner$/i, 'lead_owner'],
    [/^(assigned\s*(to)?|owner)$/i, 'lead_owner'],
    [/^(lead\s*)?status$/i, 'crm_status'],
    [/^(lead\s*)?source$/i, 'data_source'],
    [/^notes$/i, 'crm_note'],
    [/^remarks$/i, 'crm_note'],
    [/^comment/i, 'crm_note'],
    [/^city$/i, 'city'],
    [/^town$/i, 'city'],
    [/^state$/i, 'state'],
    [/^province$/i, 'state'],
    [/^region$/i, 'state'],
    [/^country$/i, 'country'],
    [/^nation$/i, 'country'],
    [/^description$/i, 'description'],
    [/^desc$/i, 'description'],
    [/^possession/i, 'possession_time'],
    [/^deadline/i, 'possession_time'],
  ];

  const mappings: ColumnMapping = {};
  for (const h of headers) {
    const normalized = h.trim();
    let mapped = false;
    for (const [pattern, field] of rules) {
      if (pattern.test(normalized)) {
        if (field === 'mobile_without_country_code') {
          mappings[normalized] = 'mobile_without_country_code';
        } else {
          mappings[normalized] = field;
        }
        mapped = true;
        break;
      }
    }
    if (!mapped) {
      mappings[normalized] = 'crm_note';
    }
  }
  return mappings;
}

export const CRM_FIELDS = [
  'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
  'company', 'city', 'state', 'country', 'lead_owner', 'crm_status',
  'crm_note', 'data_source', 'possession_time', 'description',
] as const;

const ALLOWED_STATUSES = [
  'GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE',
];

const ALLOWED_SOURCES = [
  'leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots',
];

export function extractFields(
  rows: Record<string, string>[],
  mappings: ColumnMapping,
): Record<string, string>[] {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function parsePhone(raw: string): { country_code: string; mobile: string } {
    let cleaned = raw.trim();
    if (!cleaned) return { country_code: '', mobile: '' };

    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return { country_code: '', mobile: '' };

    if (cleaned.startsWith('+')) {
      const withoutPlus = cleaned.replace(/\D/g, '');
      const knownCCs: [number, string][] = [
        [1, '1'], [2, '91'], [2, '44'], [2, '34'], [2, '86'],
        [2, '55'], [2, '61'], [2, '81'], [2, '49'], [2, '33'], [1, '7'],
      ];
      for (const [len, cc] of knownCCs) {
        if (withoutPlus.startsWith(cc)) {
          const mob = withoutPlus.slice(len);
          if (mob.length >= 7 && mob.length <= 14) {
            return { country_code: '+' + cc, mobile: mob };
          }
        }
      }
      const totalLen = withoutPlus.length;
      const orders = totalLen >= 12 ? [2, 1, 3] : [1, 2, 3];
      for (let len of orders) {
        const candidateCc = withoutPlus.slice(0, len);
        const candidateMob = withoutPlus.slice(len);
        if (candidateMob.length >= 7 && candidateMob.length <= 14) {
          return { country_code: '+' + candidateCc, mobile: candidateMob };
        }
      }
    }
    return { country_code: '', mobile: digits };
  }

  function parseDate(raw: string): string {
    const s = raw.trim();
    if (!s) return '';

    const jsDate = new Date(s);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.getFullYear() + '-' +
        String(jsDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(jsDate.getDate()).padStart(2, '0') + ' ' +
        String(jsDate.getHours()).padStart(2, '0') + ':' +
        String(jsDate.getMinutes()).padStart(2, '0') + ':' +
        String(jsDate.getSeconds()).padStart(2, '0');
    }

    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      return dmy[3] + '-' + String(dmy[2]).padStart(2, '0') + '-' + String(dmy[1]).padStart(2, '0') + ' 00:00:00';
    }

    return s;
  }

  function parseEmails(raw: string): { primary: string; additional: string[] } {
    const parts = raw.split(/[,;|/\s]+/);
    const found: string[] = [];
    for (const p of parts) {
      const t = p.trim();
      if (EMAIL_RE.test(t)) found.push(t);
    }
    if (found.length === 0) return { primary: '', additional: [] };
    return { primary: found[0], additional: found.slice(1) };
  }

  const STATUS_MAP: Record<string, string> = {
    'new': 'GOOD_LEAD_FOLLOW_UP',
    'follow up': 'GOOD_LEAD_FOLLOW_UP',
    'contacted': 'GOOD_LEAD_FOLLOW_UP',
    'qualified': 'GOOD_LEAD_FOLLOW_UP',
    'good_lead_follow_up': 'GOOD_LEAD_FOLLOW_UP',
    'did_not_connect': 'DID_NOT_CONNECT',
    'bad_lead': 'BAD_LEAD',
    'sale_done': 'SALE_DONE',
  };

  const SOURCE_MAP: Record<string, string> = {
    'facebook lead': 'leads_on_demand',
    'facebook': 'leads_on_demand',
    'google ads': 'leads_on_demand',
    'website form': 'leads_on_demand',
    'linkedin': 'leads_on_demand',
    'excel import': 'leads_on_demand',
    'excel sheets': 'leads_on_demand',
    'leads_on_demand': 'leads_on_demand',
    'meridian_tower': 'meridian_tower',
    'eden_park': 'eden_park',
    'varah swamy': 'varah_swamy',
    'varah_swamy': 'varah_swamy',
    'sarjapur_plots': 'sarjapur_plots',
  };

  function extractValue(row: Record<string, string>, fields: string[]): string {
    for (const f of fields) {
      if (row[f]?.trim()) return row[f].trim();
      const lower = f.toLowerCase();
      for (const key of Object.keys(row)) {
        if (key.toLowerCase() === lower && row[key]?.trim()) return row[key].trim();
      }
    }
    return '';
  }

  // Build reverse mapping: crm_field → csv_header
  function fieldHeader(crmField: string): string {
    const csvHeader = Object.keys(mappings).find(k => mappings[k] === crmField);
    return csvHeader || crmField;
  }

  return rows.map((row) => {
    const record: Record<string, string> = {};
    for (const f of CRM_FIELDS) record[f] = '';

    const notes: string[] = [];

    // name
    let nameVal = row[fieldHeader('name')]?.trim() || '';
    if (!nameVal) nameVal = extractValue(row, ['Full Name', 'Name', 'name', 'Lead Name', 'Customer']);
    if (nameVal) {
      const parts = nameVal.split(/[;/]/);
      record.name = parts[0].trim();
      if (parts.length > 1) notes.push('Names: ' + nameVal);
    }

    // email
    let emailVal = row[fieldHeader('email')]?.trim() || '';
    if (!emailVal) emailVal = extractValue(row, ['Email Address', 'Email', 'E-mail', 'Email ID', 'email']);
    if (emailVal) {
      const { primary, additional } = parseEmails(emailVal);
      record.email = primary;
      if (additional.length > 0) notes.push('Additional emails: ' + additional.join(', '));
    }

    // phone
    let phoneVal = '';
    const phoneHeader = fieldHeader('mobile_without_country_code');
    if (phoneHeader && row[phoneHeader]?.trim()) {
      phoneVal = row[phoneHeader].trim();
    }
    if (!phoneVal) {
      const ccHeader = fieldHeader('country_code');
      if (ccHeader && row[ccHeader]?.trim()) phoneVal = row[ccHeader].trim();
    }
    if (!phoneVal) phoneVal = extractValue(row, ['Phone Number', 'Phone', 'Mobile', 'Contact', 'mobile_without_country_code']);
    if (!phoneVal) {
      for (const v of Object.values(row)) {
        const t = v.trim();
        if (/^\+?\d{7,15}$/.test(t.replace(/[\s\-()]/g, ''))) {
          phoneVal = t;
          break;
        }
      }
    }
    if (phoneVal) {
      const { country_code, mobile } = parsePhone(phoneVal);
      record.country_code = country_code;
      record.mobile_without_country_code = mobile;
    }

    // created_at
    let dateVal = row[fieldHeader('created_at')]?.trim() || '';
    if (!dateVal) dateVal = extractValue(row, ['Date Created', 'Created At', 'created_at', 'Date', 'Timestamp']);
    if (dateVal) {
      record.created_at = parseDate(dateVal);
      if (!record.created_at) record.created_at = dateVal;
    }

    // company
    let companyVal = row[fieldHeader('company')]?.trim() || '';
    if (!companyVal) companyVal = extractValue(row, ['Company Name', 'Company', 'company', 'Organization']);
    if (companyVal) record.company = companyVal;

    // lead_owner
    let ownerVal = row[fieldHeader('lead_owner')]?.trim() || '';
    if (ownerVal) record.lead_owner = ownerVal;

    // crm_status
    let statusVal = row[fieldHeader('crm_status')]?.trim() || '';
    if (!statusVal) statusVal = extractValue(row, ['Status', 'Lead Status', 'crm_status']);
    if (statusVal) {
      const key = statusVal.toLowerCase().trim();
      record.crm_status = STATUS_MAP[key] || '';
    }

    // data_source
    let sourceVal = row[fieldHeader('data_source')]?.trim() || '';
    if (!sourceVal) sourceVal = extractValue(row, ['Lead Source', 'Source', 'data_source']);
    if (sourceVal) {
      const key = sourceVal.toLowerCase().trim();
      record.data_source = SOURCE_MAP[key] || '';
      if (!record.data_source) {
        record.data_source = key.replace(/\s+/g, '_');
      }
    }

    // possession_time
    let posVal = row[fieldHeader('possession_time')]?.trim() || '';
    if (!posVal) {
      const noteHeader = fieldHeader('crm_note');
      const noteVal = row[noteHeader]?.trim() || row['Notes']?.trim() || '';
      const posMatch = noteVal.match(/possession\s*(?:by|on|date)?\s*:?\s*(.+?)(?:\.|$)/i);
      if (posMatch) posVal = posMatch[1].trim();
    }
    if (!posVal) {
      const dateMatch = (row['Notes'] || row['notes'] || '').match(/(?:by|possession|deadline)\s+(.+?)(?:\.|$)/i);
      if (dateMatch) posVal = dateMatch[1].trim();
    }
    record.possession_time = posVal;

    // city, state, country
    record.city = row[fieldHeader('city')]?.trim() || '';
    record.state = row[fieldHeader('state')]?.trim() || '';
    record.country = row[fieldHeader('country')]?.trim() || '';

    // description
    record.description = row[fieldHeader('description')]?.trim() || '';

    // crm_note
    let noteVal = row[fieldHeader('crm_note')]?.trim() || '';
    if (!noteVal) noteVal = extractValue(row, ['Notes', 'Remarks', 'crm_note']);
    if (noteVal) notes.unshift(noteVal);
    record.crm_note = notes.join('. ');

    // Fallback: put raw values from unmapped fields into crm_note
    const mappedHeaders = new Set(Object.keys(mappings));
    for (const key of Object.keys(row)) {
      if (!mappedHeaders.has(key) && row[key]?.trim()) {
        if (record.crm_note) record.crm_note += '; ';
        record.crm_note += key + ': ' + row[key].trim();
      }
    }

    return record;
  });
}
