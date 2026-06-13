export async function onRequest(context) {
  // For all requests, pass to next handler to serve static files
  return context.next();
}
