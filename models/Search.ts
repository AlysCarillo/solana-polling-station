import { Schema } from 'borsh';

export class SearchByOwner {
  owner: string = '';
  constructor(fields?: { owner: string }) {
    if (fields) {
      this.owner = fields.owner;
    }
  }
}

export const SearchByOwnerSchema: Schema = new Map([
  [
    SearchByOwner,
    {
      kind: 'struct',
      fields: [['owner', 'string']],
    },
  ],
]);

export class SearchById {
  id: string = '';
  constructor(fields?: { id: string }) {
    if (fields) {
      this.id = fields.id;
    }
  }
}

export const SearchByIdSchema: Schema = new Map([
  [
    SearchById,
    {
      kind: 'struct',
      fields: [['id', 'string']],
    },
  ],
]);
