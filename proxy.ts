import { NextResponse, type NextRequest } from "next/server";

/** Impide servir el laboratorio antes de iniciar el stream del layout. */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0];
  if (process.env.NODE_ENV !== "development" || (host !== "localhost" && host !== "127.0.0.1")) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/nutrition/cycles-preview" };
