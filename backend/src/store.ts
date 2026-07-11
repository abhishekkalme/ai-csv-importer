export interface Lead {
  id: number;
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

let nextId = 1;
const leads: Lead[] = [];

export const leadStore = {
  addLeads(records: Record<string, string>[]): number {
    for (const record of records) {
      leads.push({
        id: nextId++,
        created_at: record.created_at || '',
        name: record.name || '',
        email: record.email || '',
        country_code: record.country_code || '',
        mobile_without_country_code: record.mobile_without_country_code || '',
        company: record.company || '',
        city: record.city || '',
        state: record.state || '',
        country: record.country || '',
        lead_owner: record.lead_owner || '',
        crm_status: record.crm_status || '',
        crm_note: record.crm_note || '',
        data_source: record.data_source || '',
        possession_time: record.possession_time || '',
        description: record.description || '',
      });
    }
    return records.length;
  },

  getLeads(): Lead[] {
    return [...leads];
  },

  clear(): void {
    leads.length = 0;
    nextId = 1;
  },
};
