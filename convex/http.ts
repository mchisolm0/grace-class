import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';

const http = httpRouter();

// GitHub OAuth callback handler
http.route({
  path: '/api/github/callback',
  method: 'GET',
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // Get the frontend URL for redirects
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Handle OAuth errors from GitHub
    if (error) {
      console.error('GitHub OAuth error:', error, errorDescription);
      return Response.redirect(
        `${frontendUrl}/github/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`,
        302,
      );
    }

    if (!code) {
      return Response.redirect(`${frontendUrl}/github/callback?error=missing_code`, 302);
    }

    try {
      // Exchange the code for an access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('GitHub token exchange error:', tokenData);
        return Response.redirect(
          `${frontendUrl}/github/callback?error=${encodeURIComponent(tokenData.error)}&error_description=${encodeURIComponent(tokenData.error_description || '')}`,
          302,
        );
      }

      const accessToken = tokenData.access_token;

      // Fetch the user's GitHub profile
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Grace-Class-App',
        },
      });

      if (!userResponse.ok) {
        console.error('Failed to fetch GitHub user:', await userResponse.text());
        return Response.redirect(`${frontendUrl}/github/callback?error=user_fetch_failed`, 302);
      }

      const userData = await userResponse.json();

      // Store the connection in the database
      // We need to pass the user info via URL params since we can't authenticate in HTTP actions
      // The frontend will call a mutation to store this after verifying the user is logged in
      const params = new URLSearchParams({
        success: 'true',
        access_token: accessToken,
        github_username: userData.login,
        github_id: String(userData.id),
        avatar_url: userData.avatar_url || '',
      });

      return Response.redirect(`${frontendUrl}/github/callback?${params.toString()}`, 302);
    } catch (err) {
      console.error('GitHub OAuth error:', err);
      return Response.redirect(`${frontendUrl}/github/callback?error=server_error`, 302);
    }
  }),
});

export default http;
