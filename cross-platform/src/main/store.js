import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const EMPTY = { nodes: [], activeNodeId: null, proxyPort: 14580, activations: {} };

export class Store {
  constructor(file, cryptoAdapter) { this.file = file; this.crypto = cryptoAdapter; }
  load() {
    try { return { ...EMPTY, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) }; }
    catch { return structuredClone(EMPTY); }
  }
  save(data) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
  publicState() {
    const data = this.load();
    return { ...data, nodes: data.nodes.map(({ encryptedKey, ...node }) => ({ ...node, hasKey: Boolean(encryptedKey) })) };
  }
  upsertNode(input) {
    const data = this.load();
    const id = input.id || crypto.randomUUID();
    const previous = data.nodes.find(n => n.id === id);
    const encryptedKey = input.apiKey ? this.crypto.encrypt(input.apiKey) : previous?.encryptedKey;
    const node = {
      id, name: input.name.trim(), baseUrl: input.baseUrl.trim().replace(/\/+$/, ''),
      model: input.model?.trim() || '', protocol: input.protocol || 'openai', encryptedKey
    };
    data.nodes = [...data.nodes.filter(n => n.id !== id), node];
    if (!data.activeNodeId) data.activeNodeId = id;
    this.save(data);
    return this.publicState();
  }
  deleteNode(id) {
    const data = this.load();
    data.nodes = data.nodes.filter(n => n.id !== id);
    if (data.activeNodeId === id) data.activeNodeId = data.nodes[0]?.id || null;
    this.save(data); return this.publicState();
  }
  setActive(id) {
    const data = this.load();
    if (!data.nodes.some(n => n.id === id)) throw new Error('Node not found');
    data.activeNodeId = id; this.save(data); return this.publicState();
  }
  activeNodeWithKey() {
    const data = this.load();
    const node = data.nodes.find(n => n.id === data.activeNodeId);
    return node ? { ...node, apiKey: node.encryptedKey ? this.crypto.decrypt(node.encryptedKey) : '' } : null;
  }
}

export function createCryptoAdapter(safeStorage) {
  return {
    encrypt(value) {
      if (safeStorage?.isEncryptionAvailable()) return `safe:${safeStorage.encryptString(value).toString('base64')}`;
      return `plain:${Buffer.from(value).toString('base64')}`;
    },
    decrypt(value) {
      if (value.startsWith('safe:')) return safeStorage.decryptString(Buffer.from(value.slice(5), 'base64'));
      if (value.startsWith('plain:')) return Buffer.from(value.slice(6), 'base64').toString();
      return '';
    }
  };
}
