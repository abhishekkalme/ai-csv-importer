import fs from 'fs';
import path from 'path';
import { parseCSV } from '../utils/csvParser';

describe('csvParser', () => {
  const testDir = path.resolve(__dirname, '../../test-temp');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should parse a valid CSV with headers and records', async () => {
    const filePath = path.join(testDir, 'valid.csv');
    fs.writeFileSync(filePath, 'name,email,phone\nJohn,john@test.com,1234567890\nJane,jane@test.com,9876543210');

    const result = await parseCSV(filePath);

    expect(result.headers).toEqual(['name', 'email', 'phone']);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toEqual({ name: 'John', email: 'john@test.com', phone: '1234567890' });
    expect(result.records[1]).toEqual({ name: 'Jane', email: 'jane@test.com', phone: '9876543210' });
  });

  it('should handle empty lines and trim whitespace', async () => {
    const filePath = path.join(testDir, 'trim.csv');
    fs.writeFileSync(filePath, 'name,email\n  Alice  ,  alice@test.com  \n\n Bob , bob@test.com ');

    const result = await parseCSV(filePath);

    expect(result.records).toHaveLength(2);
    expect(result.records[0].name).toBe('Alice');
    expect(result.records[0].email).toBe('alice@test.com');
  });

  it('should handle CSV with no data rows', async () => {
    const filePath = path.join(testDir, 'headers-only.csv');
    fs.writeFileSync(filePath, 'name,email,phone');

    const result = await parseCSV(filePath);

    expect(result.records).toHaveLength(0);
  });

  it('should handle CSV with quoted fields', async () => {
    const filePath = path.join(testDir, 'quoted.csv');
    fs.writeFileSync(
      filePath,
      'name,email,phone,company\n"John, Doe","john@test.com",+919876543210,"Tech, Corp"\nJane,jane@test.com,,'
    );

    const result = await parseCSV(filePath);

    expect(result.records).toHaveLength(2);
    expect(result.records[0].name).toBe('John, Doe');
    expect(result.records[0].company).toBe('Tech, Corp');
  });

  it('should reject non-existent file', async () => {
    await expect(parseCSV(path.join(testDir, 'nonexistent.csv'))).rejects.toThrow('File not found');
  });
});
