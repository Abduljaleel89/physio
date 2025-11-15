// backend/src/tests/storage.test.ts

import fs from 'fs';

import path from 'path';

import { LocalStorageAdapter } from '../lib/storage';

describe('LocalStorageAdapter', () => {

  const adapter = new LocalStorageAdapter({

    uploadsDir: path.join(process.cwd(), 'backend', 'test-uploads'),

    publicBaseUrl: 'http://localhost:4000',

  });



  afterAll(async () => {

    // cleanup test-uploads

    const dir = path.join(process.cwd(), 'backend', 'test-uploads');

    if (fs.existsSync(dir)) {

      fs.rmSync(dir, { recursive: true, force: true });

    }

  });



  it('saves a file buffer and returns metadata', async () => {

    const fakeFile: any = {

      originalname: 'test.png',

      mimetype: 'image/png',

      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),

    };

    const stored = await adapter.saveFile(fakeFile);

    expect(stored).toHaveProperty('id');

    expect(stored.size).toBeGreaterThan(0);

    expect(stored.url).toContain('/uploads/');

  });


});

