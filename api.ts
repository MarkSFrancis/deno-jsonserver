import { Response, ServerRequest } from 'https://deno.land/std/http/server.ts';
import { JsonHttp } from './json-http.ts';
import { Db } from './db.ts';

export class Api {
  constructor(public jsonHttp: JsonHttp, public db: Db) {
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
