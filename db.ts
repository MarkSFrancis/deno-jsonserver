import { Encoding } from './encoding.ts';
const encoding = new Encoding();

export class Db {
  private static canWrite = true;
  private static canRead = true;
  dbCache: any;

  constructor(private dbFileLocation: string = './db.json') {
    this.runWatcher(dbFileLocation);
  }

  async save(db: any) {
    this.dbCache = db;

    if (Db.canWrite) {
      try {
        const dbFile = encoding.encode(JSON.stringify(db, null, 2));
        await Deno.writeFile(this.dbFileLocation, dbFile);
      } catch (err) {
        if (err instanceof Deno.errors.PermissionDenied) {
          Db.canWrite = false;
        } else {
          console.error("Couldn't save db", err);
        }
      }
    }
  }

  async load() {
    if (!this.dbCache) {
      await this.reloadDb();
    }
    return this.dbCache;
  }

  getElement(path: string[], db: any) {
    let match = db;

    if (path.length === 0) {
      return match;
    }

    // Example url: people/1/addresses/1, gets people, then person 1, then addresses, then address 1
    for (let index = 0; index < path.length; index++) {
      if (match === undefined) {
        return match;
      }

      if (index % 2 === 0) {
        // Is collection accessor
        match = this.getChildByPropertyName(match, path[index]);
      } else {
        // Is item ID
        match = this.getChildById(match, path[index]);
      }
    }

    return match;
  }

  getChildById(parent: any, id: string) {
    return this.replaceChildById(parent, id);
  }

  getChildByPropertyName(parent: any, name: string) {
    return this.replaceChildByPropertyName(parent, name);
  }

  replaceChildById(parent: any, id: string, mutator?: (element: any) => any) {
    if (!parent || !Array.isArray(parent)) {
      return undefined;
    }

    const childIndex = parent.findIndex(p => p.id == id /* type insensitive comparison */);
    if (mutator) {
      parent[childIndex] = mutator(parent[childIndex]);
      if (parent[childIndex] === undefined) {
        delete parent[childIndex];
      }
    }

    return parent[childIndex];
  }

  replaceChildByPropertyName(parent: any, name: string, mutator?: (element: any) => any) {
    if (parent === null || typeof (parent) !== 'object' || Array.isArray(parent)) {
      return undefined;
    }

    const child = parent[name];
    if (mutator) {
      parent[name] = mutator(child);
    }

    return parent[name];
  }

  private async runWatcher(dbPath: string) {
    if (!Db.canRead) {
      return;
    }

    try {
      const watcher = Deno.watchFs(dbPath);
      for await (const _ of watcher) {
        this.reloadDb();
      }
    } catch (err) {
      if (err instanceof Deno.errors.PermissionDenied) {
        Db.canRead = false;
      } else {
        console.error('Db watcher failed to connect', err);
      }
    }
  }

  private async reloadDb() {
    if (!Db.canRead) {
      return;
    }

    try {
      const dbFile = await Deno.readFile(this.dbFileLocation);
      this.dbCache = JSON.parse(encoding.decode(dbFile));
    } catch (err) {
      if (err instanceof Deno.errors.PermissionDenied) {
        Db.canRead = false;
      } else {
        console.error("Couldn't reload db", err);
      }
    }
  }
}
