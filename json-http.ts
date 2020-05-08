import { ServerRequest, Response } from 'https://deno.land/std/http/server.ts';
import { Encoding } from './encoding.ts';
const jsonContentType = {
  key: 'content-type',
  value: 'application/json'
}

export class JsonHttp {
  constructor(public text: Encoding = new Encoding()) {
  }

  async readBodyAsJson(req: ServerRequest) {
    if (req.headers.get(jsonContentType.key) !== jsonContentType.value) {
      return undefined;
    }

    const contentBytes = await Deno.readAll(req.body);
    const content = this.text.decode(contentBytes);

    return JSON.parse(content);
  }

  splitPath(path: string) {
    const pathSplit = path.substring(1).split('/');

    return pathSplit.map(decodeURIComponent);
  }

  ok(body: any): Response {
    return {
      status: 200,
      body: JSON.stringify(body),
      headers: new Headers([
        [jsonContentType.key, jsonContentType.value]
      ])
    };
  }

  noContent(): Response {
    return {
      status: 204
    };
  }

  notFound(): Response {
    return {
      status: 404
    };
  }
}