import { createClient } from '@farcaster/quick-auth';
import { sdk } from '@farcaster/frame-sdk';

const quickAuth = createClient();

export async function verifyAuth(request: Request): Promise<number | null> {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) return null;

    try {
        // For development, if it's just a number (FID), use it directly
        const token = auth.split(' ')[1];
        const fid = Number(token);
        if (!isNaN(fid) && fid > 0) {
            console.log('Using FID directly for development:', fid);
            return fid;
        }

        // Try JWT verification for production
        const payload = await quickAuth.verifyJwt({
            token,
            domain: (new URL(process.env.NEXT_PUBLIC_URL!)).hostname
        });

        return Number(payload.sub);
    } catch (error) {
        console.error('Auth verification failed:', error);
        return null;
    }
}

// Helper to get user info from Farcaster API
export async function getUserInfo(fid: number) {
    try {
        const response = await fetch(
            `https://api.farcaster.xyz/fc/primary-address?fid=${fid}&protocol=ethereum`
        );
        if (!response.ok) return null;

        const data = await response.json();
        return {
            fid,
            address: data?.result?.address?.address
        };
    } catch (error) {
        console.error('Failed to fetch user info:', error);
        return null;
    }
}

// Helper function to make authenticated requests
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    try {
        // Ensure SDK is initialized
        if (!sdk.quickAuth) {
            throw new Error('QuickAuth SDK not initialized');
        }

        const resolvedUrl = url.startsWith('http')
            ? url
            : (() => {
                const base =
                  typeof window !== 'undefined'
                    ? window.location.origin
                    : process.env.NEXT_PUBLIC_URL;

                if (!base) {
                    throw new Error('Base URL is not configured for authenticated fetches');
                }

                return `${base.replace(/\/$/, '')}${url}`;
            })();

        const headers = new Headers(options.headers);
        if (options.method && options.method !== 'GET') {
            headers.set('Content-Type', 'application/json');
        }
        headers.set('Accept', 'application/json');

        const response = await sdk.quickAuth.fetch(resolvedUrl, {
            ...options,
            headers,
        });

        // Handle non-OK responses
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('fetchWithAuth error:', error);
        throw error; // Re-throw to let the caller handle it
    }
}