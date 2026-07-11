jest.mock('../services/geminiService', () => ({
  mapColumns: jest.fn().mockResolvedValue({
    mappings: {
      'Full Name': 'name',
      'Email Address': 'email',
      'Phone Number': 'mobile_without_country_code',
      'Company Name': 'company',
    },
    unmapped: [],
  }),
  extractFields: jest.fn().mockImplementation((rows: Record<string, string>[]) =>
    rows.map((row) => ({
      created_at: '',
      name: row['Full Name'] || '',
      email: row['Email Address'] || '',
      country_code: '',
      mobile_without_country_code: row['Phone Number'] || '',
      company: row['Company Name'] || '',
      city: '',
      state: '',
      country: '',
      lead_owner: '',
      crm_status: '',
      crm_note: '',
      data_source: '',
      possession_time: '',
      description: '',
    }))
  ),
}));

import { processRecords } from '../services/processService';

describe('processRecords', () => {
  it('should process and return imported records with email', async () => {
    const records = [
      { 'Full Name': 'John Doe', 'Email Address': 'john@test.com', 'Phone Number': '1234567890', 'Company Name': 'Test Corp' },
    ];

    const result = await processRecords(records);

    expect(result.imported).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.imported[0].email).toBe('john@test.com');
  });

  it('should skip records with no email or phone', async () => {
    const records = [
      { 'Full Name': 'No Contact', 'Email Address': '', 'Phone Number': '', 'Company Name': '' },
    ];

    const result = await processRecords(records);

    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('No email or mobile number found');
  });

  it('should handle empty record array', async () => {
    const result = await processRecords([]);

    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('should process mixed valid and invalid records', async () => {
    const records = [
      { 'Full Name': 'Valid', 'Email Address': 'valid@test.com', 'Phone Number': '1111111111', 'Company Name': 'A' },
      { 'Full Name': 'Invalid', 'Email Address': '', 'Phone Number': '', 'Company Name': '' },
      { 'Full Name': 'Also Valid', 'Email Address': '', 'Phone Number': '2222222222', 'Company Name': 'B' },
    ];

    const result = await processRecords(records);

    expect(result.imported).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
  });
});
