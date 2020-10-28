# Deno REST/JSON Server
<div>
  <img alt="deno logo" src="https://deno.land/logo.svg" width=200 height=200 />
</div>
A full REST API, optionally powered by a single JSON file as a database

## Getting Started

1. Install [deno](https://deno.land/#install)
1. Execute
    ```sh
    deno run --allow-net https://raw.githubusercontent.com/MarkSFrancis/deno-jsonserver/master/app.ts
    ```
    This will start the app with an in-memory database that won't persist, and will use port 8000 on your local machine. 

## Options
1. You can add `--allow-read` to allow the app to use a json file on your system. The first arg after `app.ts` should be the file location for your JSON db. If this is ommitted, it'll default to `./db.json`. If you don't allow read permission, the path will be ignored.
1. You can add `--allow-write` if you want the app to be able to persist results after POST, PUT, PATCH or DELETE requests.
1. You can set the port to use with `--port`. If you omit this, the default port will be port 8000.
    For example:
    ```sh
    deno run --allow-read --allow-write --allow-net https://raw.githubusercontent.com/MarkSFrancis/deno-jsonserver/master/app.ts ./my-db.json --port 4200
    ```
