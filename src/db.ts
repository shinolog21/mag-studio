import Dexie, { type Table } from 'dexie';
import type { ImageAsset, Issue } from './types';

class MagDB extends Dexie {
  issues!: Table<Issue, string>;
  assets!: Table<ImageAsset, string>;

  constructor() {
    super('mag-studio');
    this.version(1).stores({
      issues: 'id, vol, updatedAt',
      assets: 'id',
    });
  }
}

export const db = new MagDB();
