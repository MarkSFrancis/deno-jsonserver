function getArgSwitch(argId: string): boolean {
  return Deno.args.findIndex(a => a === argId) >= 0;
}

function getArgValue(argId: string): string | undefined {
  const index = Deno.args.findIndex(a => a === argId);

  if (index >= 0) {
    const value = Deno.args[index + 1];
    if (value === undefined) {
      throw new Error(`Value must be set for arg ${argId}`);
    } else {
      return value;
    }
  } else {
    return undefined;
  }
}

export function getArgs() {
  let dbPath = './db.json';
  if (Deno.args.length > 0 && !Deno.args[0].startsWith('--')) {
    dbPath = Deno.args[0];
  }

  const port = getArgValue('--port');

  return {
    port: parseInt(port || '8000'),
    dbPath
  }
}

export interface JsonServerArgs {
  port: number;
}
