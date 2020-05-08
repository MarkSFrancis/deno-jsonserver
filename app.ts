import { serve } from 'https://deno.land/std/http/server.ts';
import { JsonHttp } from './json-http.ts';
import { DbService } from './db.ts'

const port = parseInt(<string>Deno.env.get('PORT')) || 8000;
const app = new DbService(new JsonHttp());

const server = serve({ port });

console.log(`Listening on http://localhost:${port}`);

for await (const req of server) {
  const response = await app.handleRequest(req);
  req.respond(response);
}
