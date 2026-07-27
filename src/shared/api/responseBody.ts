export async function parseResponseBody(response: Pick<Response, "text">): Promise<unknown> {
  const text = await response.text();
  return text.trim() ? JSON.parse(text) : undefined;
}
