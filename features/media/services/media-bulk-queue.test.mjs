import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// La comprobación de tipos la hace el build de Next; aquí se prueba la cola sin navegador ni HTTP.
const source = await readFile(
  new URL("./media-bulk-queue.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const queue = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

function fixture() {
  let rows = queue.createMediaBulkRows(
    Array.from(
      { length: 5 },
      (_, index) =>
        new File(["audio"], `episodio_${index + 1}.mp3`, {
          type: "audio/mpeg",
        }),
    ),
  );
  return {
    get rows() {
      return rows;
    },
    apply(row) {
      rows = rows.map((previous) =>
        previous.key === row.key ? row : previous,
      );
    },
  };
}

test("cinco archivos: cuatro borradores y un error; el reintento solo crea el quinto", async () => {
  const state = fixture();
  const calls = [];
  await queue.createMediaBulkDrafts(
    state.rows,
    async (row) => {
      calls.push(row.file.name);
      if (row.file.name === "episodio_5.mp3") throw new Error("Error simulado");
      return `media-${row.file.name}`;
    },
    state.apply,
  );
  assert.equal(state.rows.filter((row) => row.state === "borrador").length, 4);
  assert.deepEqual(queue.mediaBulkResult(state.rows[4]), {
    nombre: "episodio_5.mp3",
    estado: "error",
    error: "Error simulado",
  });
  await queue.createMediaBulkDrafts(
    state.rows,
    async (row) => {
      calls.push(row.file.name);
      return `media-${row.file.name}`;
    },
    state.apply,
  );
  assert.deepEqual(calls, [
    "episodio_1.mp3",
    "episodio_2.mp3",
    "episodio_3.mp3",
    "episodio_4.mp3",
    "episodio_5.mp3",
    "episodio_5.mp3",
  ]);
  assert.equal(state.rows.filter((row) => row.state === "borrador").length, 5);
});

test("publicación parcial: conserva ids y reintenta solo la publicación fallida", async () => {
  const state = fixture();
  await queue.createMediaBulkDrafts(
    state.rows,
    async (row) => `media-${row.file.name}`,
    state.apply,
  );
  const calls = [];
  await queue.publishMediaBulkDrafts(
    state.rows,
    async (row) => {
      calls.push(row.mediaId);
      if (row.file.name === "episodio_3.mp3") throw new Error("Error simulado");
    },
    state.apply,
  );
  assert.equal(state.rows.filter((row) => row.state === "publicado").length, 4);
  assert.equal(state.rows[2].mediaId, "media-episodio_3.mp3");
  assert.equal(queue.mediaBulkDraftCandidates(state.rows).length, 0);
  await queue.publishMediaBulkDrafts(
    state.rows,
    async (row) => {
      calls.push(row.mediaId);
    },
    state.apply,
  );
  assert.equal(calls.length, 6);
  assert.equal(calls.at(-1), "media-episodio_3.mp3");
  assert.equal(state.rows.filter((row) => row.state === "publicado").length, 5);
});

test("el título nace del archivo y los nombres duplicados conservan identidades distintas", () => {
  assert.equal(
    queue.mediaTitleFromFilename("Mi_podcast-final.mp3"),
    "Mi podcast final",
  );
  const rows = queue.createMediaBulkRows([
    new File(["a"], "igual.mp3"),
    new File(["b"], "igual.mp3"),
  ]);
  assert.notEqual(rows[0].key, rows[1].key);
  assert.equal(queue.mediaBulkResult(rows[0]), null);
});
