import { Response, ServerRequest } from 'https://deno.land/std/http/server.ts';
import { Encoding } from './encoding.ts';
import { JsonHttp } from './json-http.ts';
const encoding = new Encoding();

export class DbService {
  constructor(public jsonHttp: JsonHttp, public db: Db = new Db()) {
  }

  async handleRequest(request: ServerRequest): Promise<Response> {
    const path = this.jsonHttp.splitPath(request.url);
    const body = await this.jsonHttp.readBodyAsJson(request);

    switch (request.method) {
      case 'GET':
        return await this.get(path);
      case 'POST':
        return await this.create(path, body);
      case 'PATCH':
        return await this.update(path, body);
      case 'PUT':
        return await this.replace(path, body);
      case 'DELETE':
        return await this.delete(path);
    }

    return this.jsonHttp.notFound();
  }

  async get(path: string[]): Promise<Response> {
    const db = await this.db.load();

    if (path.length < 1) {
      return {
        status: 200
      };
    }

    const match = this.db.getElement(path, db);

    if (!match) {
      return this.jsonHttp.notFound();
    }

    return this.jsonHttp.ok(match);
  }

  async create(path: string[], item: any): Promise<Response> {
    const db = await this.db.load();

    const parent = this.db.getElement(path, db);
    if (!Array.isArray(parent)) {
      return this.jsonHttp.notFound();
    }

    if (!item['id']) {
      const nextId = Math.max(...parent.map(elem => <number>elem.id)) + 1;

      item['id'] = nextId;
    }

    parent.push(item);
    await this.db.save(db);
    return item;
  }

  async update(path: string[], item: any): Promise<Response> {
    const db = await this.db.load();

    const parent = this.db.getElement(path.slice(0, path.length - 1), db);

    let response = this.jsonHttp.notFound();
    this.db.replaceChildById(parent, path[path.length - 1], elem => {
      Object.assign(item, elem);

      response = this.jsonHttp.ok(item);
      return item;
    });

    await this.db.save(db);
    return response;
  }

  async replace(path: string[], item: any): Promise<Response> {
    const db = await this.db.load();

    const parent = this.db.getElement(path.slice(0, path.length - 1), db);

    let response = this.jsonHttp.notFound();
    this.db.replaceChildById(parent, path[path.length - 1], elem => {
      if (!item['id']) {
        item['id'] = elem['id'];
      }

      response = this.jsonHttp.ok(item);
      return item;
    });

    await this.db.save(db);
    return response;
  }

  async delete(path: string[]): Promise<Response> {
    const db = await this.db.load();

    if (path.length < 2) {
      return this.jsonHttp.notFound();
    }

    const grandParent = this.db.getElement(path.slice(0, path.length - 2), db);
    let result: Response = this.jsonHttp.notFound();

    this.db.replaceChildByPropertyName(grandParent, path[path.length - 2], (parent) => {
      if (!parent) {
        return;
      }
      result = this.jsonHttp.noContent();

      this.db.replaceChildById(parent, path[path.length - 1], () => {
        return undefined;
      });
    });

    return result;
  }
}

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
