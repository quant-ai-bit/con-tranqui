import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/contracts/:path*",
    "/api/dashboard/:path*",
    "/api/scopes/:path*"
  ]
};
