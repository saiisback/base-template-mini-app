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
export async function fetchWithAuth(url: string, options?: RequestInit) {
    try {
        // Ensure SDK is initialized
        if (!sdk.quickAuth) {
            throw new Error('QuickAuth SDK not initialized');
        }

        // If options include a body, ensure Content-Type is set
        if (options?.body && !options.headers) {
            options.headers = {
                'Content-Type': 'application/json',
            };
        }

        // Make the request
        const response = await sdk.quickAuth.fetch(url, options);

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