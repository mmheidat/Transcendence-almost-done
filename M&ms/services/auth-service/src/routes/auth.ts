import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import oauthPlugin from '@fastify/oauth2';
import axios from 'axios';
import prisma from '../lib/prisma.js';
import { authenticate, JwtPayload } from '../lib/authMiddleware.js';
import { publishEvent } from '../lib/redis.js';

const registerSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(8),
    display_name: z.string().min(3).max(30).optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

// getRequestOrigin: derive frontend origin from proxy headers.
// 1) Reads x-forwarded-proto / x-forwarded-host (or host) from request headers.
// 2) Falls back to 'https' and 'localhost:8443' if headers are missing.
// 3) Builds a proto://host origin string.
// 4) Used to redirect back to the correct frontend after OAuth.
function getRequestOrigin(request: any): string {
    const proto = request.headers['x-forwarded-proto'] || 'https';
    const host = request.headers['x-forwarded-host'] || request.headers['host'] || 'localhost:8443';
    return `${proto}://${host}`;
}

const googleOAuthConfig = {
    name: 'googleOAuth2',
    credentials: {
        client: {
            id: process.env.GOOGLE_CLIENT_ID!,
            secret: process.env.GOOGLE_CLIENT_SECRET!
        },
        auth: {
            authorizeHost: 'https://accounts.google.com',
            authorizePath: '/o/oauth2/v2/auth',
            tokenHost: 'https://oauth2.googleapis.com',
            tokenPath: '/token'
        }
    },
    callbackUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback',
    scope: ['email', 'profile']
};

interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    picture: string;
}

// authRoutes: Fastify auth module (register/login/oauth/me/logout/verify).
// 1) Optionally registers Google OAuth if env credentials exist.
// 2) Exposes auth endpoints for credentials + Google OAuth.
// 3) Uses Prisma for persistence, bcrypt for password checks, JWT for sessions.
// 4) Publishes user events to Redis for other services (created/login/logout).
const authRoutes: FastifyPluginAsync = async (fastify) => {
    // OAuth plugin registration.
    // 1) Checks GOOGLE_CLIENT_ID/SECRET presence to avoid misconfigured startup.
    // 2) Registers @fastify/oauth2 with Google config.
    // 3) Enables fastify.googleOAuth2 helper methods on the instance.
    // 4) Logs successful registration for visibility.
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        await fastify.register(oauthPlugin, googleOAuthConfig);
        console.log('✅ OAuth plugin registered');
    }

    // POST /register: create a local account and issue JWT.
    // 1) Validates request body via Zod.
    // 2) Rejects if email/username already exists.
    // 3) Hashes password and creates user in DB.
    // 4) Signs JWT + publishes user:created event + returns user payload.
    fastify.post('/register', async (request, reply) => {
        try {
            const body = registerSchema.parse(request.body);

            const existing = await prisma.user.findFirst({
                where: { OR: [{ email: body.email }, { username: body.username }] }
            });

            if (existing) {
                return reply.code(409).send({ error: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(body.password, 10);
            const user = await prisma.user.create({
                data: {
                    username: body.username,
                    email: body.email,
                    passwordHash: hashedPassword,
                    displayName: body.display_name || body.username,
                }
            });

            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });

            await publishEvent('user:created', { userId: user.id, username: user.username });

            return reply.code(201).send({
                message: 'User registered successfully',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.displayName,
                    avatar_url: user.avatarUrl
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation failed', details: error.errors });
            }
            console.error('Register error:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // POST /login: verify credentials, handle optional 2FA, issue JWT.
    // 1) Validates request body via Zod.
    // 2) Finds user by email and verifies password with bcrypt.
    // 3) If OAuth-only account, instructs to sign in via provider.
    // 4) Updates online status, signs JWT (partial if 2FA enabled), publishes user:login.
    fastify.post('/login', async (request, reply) => {
        try {
            const body = loginSchema.parse(request.body);

            const user = await prisma.user.findUnique({ where: { email: body.email } });
            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            if (user.oauthProvider && !user.passwordHash) {
                return reply.code(400).send({ error: `Please sign in with ${user.oauthProvider}` });
            }

            const valid = await bcrypt.compare(body.password, user.passwordHash);
            if (!valid) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { isOnline: true, lastSeen: new Date() }
            });

            if (user.isTwoFactorEnabled) {
                const token = fastify.jwt.sign({
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    isPartial: true
                });

                return reply.send({
                    message: '2FA required',
                    requires2fa: true,
                    token
                });
            }

            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });

            await publishEvent('user:login', { userId: user.id });

            return reply.send({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.displayName,
                    avatar_url: user.avatarUrl,
                    is_online: user.isOnline
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation failed' });
            }
            console.error('Login error:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // GET /google: start Google OAuth flow.
    // 1) Derives the caller origin (to redirect back to correct frontend).
    // 2) Stores origin in an httpOnly cookie for the callback step.
    // 3) Generates Google authorization URL via fastify.googleOAuth2.
    // 4) Redirects the user agent to Google consent screen.
    fastify.get('/google', async (request, reply) => {
        try {
            const origin = getRequestOrigin(request);
            reply.setCookie('oauth_origin', origin, { path: '/', httpOnly: true, sameSite: 'lax' });
            const authUrl = await fastify.googleOAuth2.generateAuthorizationUri(request, reply);
            return reply.redirect(authUrl);
        } catch (error) {
            console.error('OAuth init error:', error);
            return reply.code(500).send({ error: 'Failed to initiate OAuth' });
        }
    });

    // GET /google/callback: finalize Google OAuth and issue JWT.
    // 1) Exchanges authorization code for access token.
    // 2) Fetches Google user profile (userinfo) and checks verified_email.
    // 3) Finds or creates/links a local user record (by oauthId or email).
    // 4) Marks user online, signs JWT, and redirects back to frontend with token.
    fastify.get('/google/callback', async (request, reply) => {
        try {
            const result = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

            if (!result?.token?.access_token) {
                const frontendUrl = (request as any).cookies?.oauth_origin || process.env.FRONTEND_URL || 'https://localhost:8443';
                return reply.redirect(`${frontendUrl}?message=Failed to get access token`);
            }

            const { data: googleUser } = await axios.get<GoogleUserInfo>(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                { headers: { Authorization: `Bearer ${result.token.access_token}` } }
            );

            if (!googleUser.verified_email) {
                const frontendUrl = (request as any).cookies?.oauth_origin || process.env.FRONTEND_URL || 'https://localhost:8443';
                return reply.redirect(`${frontendUrl}?message=Email not verified`);
            }

            let user = await prisma.user.findFirst({
                where: { oauthProvider: 'google', oauthId: googleUser.id }
            });

            if (!user) {
                user = await prisma.user.findUnique({ where: { email: googleUser.email } });

                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { oauthProvider: 'google', oauthId: googleUser.id, avatarUrl: googleUser.picture }
                    });
                } else {
                    const username = googleUser.email.split('@')[0] + '_' + Date.now().toString().slice(-4);
                    user = await prisma.user.create({
                        data: {
                            email: googleUser.email,
                            username,
                            displayName: googleUser.name,
                            avatarUrl: googleUser.picture,
                            oauthProvider: 'google',
                            oauthId: googleUser.id,
                            passwordHash: ''
                        }
                    });
                    await publishEvent('user:created', { userId: user.id, username: user.username });
                }
            } else {
                // Avatar update policy.
                // 1) Fetches current avatar from DB.
                // 2) Updates avatar only if none is set (keeps user-uploaded custom avatar).
                // 3) Prevents overwriting existing custom avatar on repeated OAuth logins.
                // 4) Uses Google picture URL as default avatar source.
                const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
                if (!currentUser?.avatarUrl) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { avatarUrl: googleUser.picture }
                    });
                }
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { isOnline: true, lastSeen: new Date() }
            });

            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });

            const frontendUrl = (request as any).cookies?.oauth_origin || process.env.FRONTEND_URL || 'https://localhost:8443';
            return reply.redirect(`${frontendUrl}?token=${token}`);

        } catch (error) {
            console.error('OAuth callback error:', error);
            const frontendUrl = (request as any).cookies?.oauth_origin || process.env.FRONTEND_URL || 'https://localhost:8443';
            return reply.redirect(`${frontendUrl}?message=Authentication failed`);
        }
    });

    // POST /logout: mark user offline.
    // 1) Requires valid JWT via authenticate preHandler.
    // 2) Reads user id from request.user.
    // 3) Updates DB to set isOnline=false and lastSeen=now.
    // 4) Publishes user:logout event and returns success message.
    fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: false, lastSeen: new Date() }
        });
        await publishEvent('user:logout', { userId: user.id });
        return reply.send({ message: 'Logged out successfully' });
    });

    // GET /me: return current authenticated user profile.
    // 1) Requires valid JWT via authenticate preHandler.
    // 2) Loads full user record from DB by token user id.
    // 3) Returns 404 if user no longer exists.
    // 4) Returns user fields used by the frontend profile.
    fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
        const tokenUser = request.user as JwtPayload;
        const user = await prisma.user.findUnique({ where: { id: tokenUser.id } });

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send({
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.displayName,
            avatar_url: user.avatarUrl,
            nationality: user.nationality,
            date_of_birth: user.dateOfBirth,
            phone: user.phone,
            gender: user.gender,
            is_online: user.isOnline,
            oauth_provider: user.oauthProvider,
            created_at: user.createdAt
        });
    });

    // GET /verify: simple token validity endpoint (internal use).
    // 1) Requires valid JWT via authenticate preHandler.
    // 2) If request reaches handler, token is valid.
    // 3) Returns { valid: true } plus decoded user payload.
    // 4) Useful for internal services to validate inter-service JWT calls.
    fastify.get('/verify', { preHandler: [authenticate] }, async (request, reply) => {
        return reply.send({ valid: true, user: request.user });
    });
};

export default authRoutes;