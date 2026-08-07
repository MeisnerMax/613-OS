import { NextResponse, type NextRequest } from "next/server";
import { googleAuthCookieNames } from "@/lib/auth/google-workspace";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
  const names = googleAuthCookieNames();
  response.cookies.delete(names.accessToken);
  response.cookies.delete(names.email);
  response.cookies.delete(names.subject);
  response.cookies.delete(names.hostedDomain);
  response.cookies.delete(names.state);
  response.cookies.delete(names.pkce);
  return response;
}
