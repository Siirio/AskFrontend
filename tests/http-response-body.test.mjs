import test from "node:test";
import assert from "node:assert/strict";
import { parseResponseBody } from "../src/shared/api/responseBody.ts";

test("empty successful response body resolves without JSON parsing", async () => {
  const response = new Response("", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  assert.equal(await parseResponseBody(response), undefined);
});

test("JSON response body is parsed when content is present", async () => {
  const response = new Response('{"conversation_id":"conversation-1"}', {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  assert.deepEqual(await parseResponseBody(response), {
    conversation_id: "conversation-1",
  });
});
