import { Schema } from 'borsh';

export class BlockPollInstruction {
  action: number = -1;
  data: Uint8Array = new Uint8Array();
  space: number = 0;
  lamports: number = 0;
  constructor(fields?: {
    action: number;
    data: Uint8Array;
    space: number;
    lamports: number;
  }) {
    if (fields) {
      this.action = fields.action;
      this.data = fields.data;
      this.space = fields.space;
      this.lamports = fields.lamports;
    }
  }
}

export const InstructionSchema: Schema = new Map([
  [
    BlockPollInstruction,
    {
      kind: 'struct',
      fields: [
        ['action', 'u8'],
        ['data', ['u8']],
        ['space', 'u64'],
        ['lamports', 'u64'],
      ],
    },
  ],
]);
