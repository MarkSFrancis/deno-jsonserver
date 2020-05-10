import { serve } from 'https://deno.land/std/http/server.ts';
import { JsonHttp } from './json-http.ts';
import { Db } from './db.ts'
import { Api } from './api.ts';
import { getArgs } from './args.ts';

const { port, dbPath } = getArgs();
const appDb = new Db(dbPath);
const app = new Api(new JsonHttp(), appDb);

const server = serve({ port });

console.log(`Listening on http://localhost:${port}`);

for await (const req of server) {
  const response = await app.handleRequest(req);
  req.respond(response);
}
