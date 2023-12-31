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