import { env } from "./env";

export function isCronAuthorized(request: Request | undefined, secret = env.CRON_SECRET) {
  if (!secret) {
    return true;
  }

  const authorization = request?.headers.get("authorization");
  const cronSecret = request?.headers.get("x-cron-secret");

  return authorization === `Bearer ${secret}` || cronSecret === secret;
}

export function unauthorizedCronResponse() {
  return Response.json({ error: "Unauthorized cron request" }, { status: 401 });
}
